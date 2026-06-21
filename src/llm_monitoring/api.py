from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import logging
import ollama
import sqlite3
from pathlib import Path

import numpy as np

# your modules
from src.llm_monitoring.embedder import embed_texts
from src.llm_monitoring.llm_drift_scorer import compute_drift
from src.llm_monitoring.vector_store import (
    init_collection,
    store_embeddings,
    get_embeddings,
)

logger = logging.getLogger("llm_monitoring")

app = FastAPI(title="LLM Drift Monitoring API")


@app.on_event("startup")
def initialize_qdrant():
    try:
        init_collection(vector_size=384)
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection on startup: {e}")

# -------------------------------
# 🔹 SQLite Storage
# -------------------------------
DB_FILE = Path(__file__).resolve().parents[2] / "drift_history.db"

# Fallback in-memory list in case database is corrupt or unavailable
fallback_drift_history = []
db_available = True

def init_db():
    global db_available
    try:
        # Ensure parent directory exists
        DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drift_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                centroid_score REAL NOT NULL,
                mmd_score REAL NOT NULL,
                severity TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
        db_available = True
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database, falling back to in-memory: {e}")
        db_available = False

def save_drift_record(centroid_score: float, mmd_score: float, severity: str):
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.isoformat()
    record = {
        "timestamp": now_utc,
        "centroid_score": centroid_score,
        "mmd_score": mmd_score,
        "severity": severity
    }
    
    if not db_available:
        fallback_drift_history.append(record)
        if len(fallback_drift_history) > 1000:
            fallback_drift_history.pop(0)
        return
        
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO drift_history (timestamp, centroid_score, mmd_score, severity) VALUES (?, ?, ?, ?)",
            (timestamp_str, centroid_score, mmd_score, severity)
        )
        conn.commit()
        
        # Keep latest 1000 records
        cursor.execute("""
            DELETE FROM drift_history 
            WHERE id NOT IN (
                SELECT id FROM drift_history 
                ORDER BY id DESC 
                LIMIT 1000
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Database error during save, using in-memory fallback: {e}")
        fallback_drift_history.append(record)
        if len(fallback_drift_history) > 1000:
            fallback_drift_history.pop(0)

def load_drift_history() -> list[dict]:
    if not db_available:
        return fallback_drift_history
        
    records = []
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp, centroid_score, mmd_score, severity FROM drift_history ORDER BY id ASC")
        rows = cursor.fetchall()
        for row in rows:
            timestamp_val = row[0]
            try:
                t_str = row[0]
                if t_str.endswith("Z"):
                    timestamp_val = datetime.fromisoformat(t_str[:-1]).replace(tzinfo=timezone.utc)
                else:
                    parsed_dt = datetime.fromisoformat(t_str)
                    if parsed_dt.tzinfo is None:
                        parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                    timestamp_val = parsed_dt
            except ValueError:
                pass
            records.append({
                "timestamp": timestamp_val,
                "centroid_score": row[1],
                "mmd_score": row[2],
                "severity": row[3]
            })
        conn.close()
    except Exception as e:
        logger.error(f"Database error during load, returning in-memory fallback: {e}")
        return fallback_drift_history
        
    return records

# Initialize database
init_db()

# Load persisted history or empty fallback
drift_history = load_drift_history()
logger.info(f"Loaded {len(drift_history)} drift history records from SQLite.")
print(f"Loaded {len(drift_history)} drift history records from SQLite.")

# -------------------------------
# 🔹 In-memory storage (for now)
# -------------------------------
baseline_responses = []
current_responses = []


# -------------------------------
# 🔹 Request Schema
# -------------------------------
class PromptRequest(BaseModel):
    prompt: str


# -------------------------------
# 🔹 Ollama LLM Response Generator
# -------------------------------
def generate_response(prompt: str) -> str:
    try:
        response = ollama.chat(
            model="smollm:135m",
            messages=[{"role": "user", "content": prompt}],
            options={"num_predict": 128},
        )
        content = response.get("message", {}).get("content", "").strip()
        if not content:
            raise ValueError("Empty response received from Ollama.")
        return content
    except Exception as e:
        logger.warning(f"Ollama generation failed, using fallback mock response for '{prompt}': {e}")
        return f"This is a mock response for prompt: '{prompt}' to simulate model output drift monitoring."


# -------------------------------
# 🔹 Endpoint 1: Generate response
# -------------------------------
@app.post("/generate")
def generate(req: PromptRequest):
    response = generate_response(req.prompt)

    # store response
    current_responses.append(response)

    return {
        "id": str(uuid.uuid4()),
        "prompt": req.prompt,
        "response": response,
        "timestamp": datetime.now(timezone.utc)
    }


# -------------------------------
# 🔹 Endpoint 2: Set baseline
# -------------------------------
@app.post("/baseline")
def set_baseline():
    global baseline_responses

    baseline_responses = current_responses.copy()
    current_responses.clear()

    if baseline_responses:
        try:
            init_collection(vector_size=384, reset=True)
            base_emb = embed_texts(baseline_responses)
            store_embeddings(base_emb, "baseline")
        except Exception as e:
            logger.error(f"Failed to store baseline embeddings in Qdrant: {e}")

    return {
        "message": "Baseline set successfully",
        "baseline_size": len(baseline_responses)
    }


# -------------------------------
# 🔹 Endpoint 3: Compute drift
# -------------------------------
@app.get("/drift")
def get_drift():
    global drift_history
    if not baseline_responses and not current_responses:
        return {
            "status": "not_initialized",
            "severity": "NOT_READY",
            "health_score": None,
            "centroid_score": None,
            "mmd_score": None,
            "message": "No baseline established yet."
        }
    if current_responses and not baseline_responses:
        return {
            "status": "waiting_for_baseline",
            "severity": "NOT_READY",
            "health_score": None,
            "centroid_score": None,
            "mmd_score": None,
            "message": "Waiting for baseline creation."
        }
    if baseline_responses and not current_responses:
        return {
            "status": "waiting_for_telemetry",
            "severity": "NOT_READY",
            "health_score": None,
            "centroid_score": None,
            "mmd_score": None,
            "message": "Waiting for comparison samples."
        }

    # Attempt to load baseline embeddings from Qdrant first
    try:
        stored = get_embeddings("baseline")
    except Exception as e:
        logger.warning(f"Failed to load baseline embeddings from Qdrant: {e}")
        stored = []

    if stored:
        base_emb = np.array(stored)
    else:
        base_emb = embed_texts(baseline_responses)

    curr_emb = embed_texts(current_responses)

    # drift score
    result = compute_drift(base_emb, curr_emb)

    # store history
    save_drift_record(float(result.centroid_score), float(result.mmd_score), str(result.severity))
    
    # Reload drift history from database
    drift_history = load_drift_history()

    # Get the latest entry
    drift_res = drift_history[-1] if drift_history else {
        "timestamp": datetime.now(timezone.utc),
        "centroid_score": float(result.centroid_score),
        "mmd_score": float(result.mmd_score),
        "severity": str(result.severity)
    }

    response_payload = dict(drift_res)
    response_payload["status"] = "ready"
    return response_payload


# -------------------------------
# 🔹 Endpoint 4: Drift history
# -------------------------------
@app.get("/drift/history")
@app.get("/drift-history")
def get_history():
    global drift_history
    drift_history = load_drift_history()
    return {"history": drift_history[-20:]}  # last 20 points


# -------------------------------
# 🔹 Endpoint 5: Samples (for UI)
# -------------------------------
@app.get("/samples")
def get_samples():
    return {
        "baseline": baseline_responses[:5],
        "current": current_responses[:5]
    }


# -------------------------------
# 🔹 Endpoint 6: Root Cause Analysis (RCA)
# -------------------------------
@app.get("/drift/rca")
def get_llm_rca():
    if not baseline_responses or not current_responses:
        return {
            "available": False,
            "message": "Not enough data for RCA."
        }

    # Attempt to load baseline embeddings from Qdrant first
    try:
        stored = get_embeddings("baseline")
    except Exception as e:
        logger.warning(f"Failed to load baseline embeddings from Qdrant: {e}")
        stored = []

    if stored:
        base_emb = np.array(stored)
    else:
        base_emb = embed_texts(baseline_responses)

    curr_emb = embed_texts(current_responses)
    result = compute_drift(base_emb, curr_emb)

    baseline_examples = baseline_responses[:5]
    telemetry_examples = current_responses[:5]

    summary = "Current responses differ from baseline responses."
    possible_cause = "Distribution shifted to a different topic domain."

    try:
        ollama_prompt = f"""
        Analyze these two lists of LLM responses and identify if there is a topic/semantic shift between them:

        Baseline:
        {chr(10).join(f'- {r}' for r in baseline_examples)}

        Current Telemetry:
        {chr(10).join(f'- {r}' for r in telemetry_examples)}

        Compare the topics and generate:
        1. A 1-sentence summary of the difference.
        2. A 1-sentence possible cause for the shift.

        Format the response exactly as a JSON object with keys "summary" and "possible_cause".
        """

        response = ollama.chat(
            model="smollm:135m",
            messages=[{"role": "user", "content": ollama_prompt}],
            options={"num_predict": 128},
        )
        content = response.get("message", {}).get("content", "").strip()

        import json
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)
        if "summary" in data and "possible_cause" in data:
            summary = data["summary"]
            possible_cause = data["possible_cause"]
    except Exception as e:
        logger.warning(f"Failed to generate LLM RCA via Ollama: {e}")
        # Rule-based fallback if Ollama fails
        if result.severity == "LOW":
            summary = "Current response embeddings align with baseline embeddings."
            possible_cause = "No significant topic shift detected."
        else:
            summary = "Current response embeddings diverge significantly from baseline embeddings."
            possible_cause = "Prompt distribution shifted to a different topic domain."

    return {
        "available": True,
        "baseline_size": len(baseline_responses),
        "telemetry_size": len(current_responses),
        "severity": str(result.severity),
        "summary": summary,
        "baseline_examples": baseline_examples,
        "telemetry_examples": telemetry_examples,
        "possible_cause": possible_cause
    }

    # Attempt to load baseline embeddings from Qdrant first
    try:
        stored = get_embeddings("baseline")
    except Exception as e:
        logger.warning(f"Failed to load baseline embeddings from Qdrant: {e}")
        stored = []

    if stored:
        base_emb = np.array(stored)
    else:
        base_emb = embed_texts(baseline_responses)

    curr_emb = embed_texts(current_responses)
    result = compute_drift(base_emb, curr_emb)

    baseline_examples = baseline_responses[:5]
    telemetry_examples = current_responses[:5]

    summary = "Current responses differ from baseline responses."
    possible_cause = "Distribution shifted to a different topic domain."

    try:
        ollama_prompt = f"""
        Analyze these two lists of LLM responses and identify if there is a topic/semantic shift between them:

        Baseline:
        {chr(10).join(f'- {r}' for r in baseline_examples)}

        Current Telemetry:
        {chr(10).join(f'- {r}' for r in telemetry_examples)}

        Compare the topics and generate:
        1. A 1-sentence summary of the difference.
        2. A 1-sentence possible cause for the shift.

        Format the response exactly as a JSON object with keys "summary" and "possible_cause".
        """

        response = ollama.chat(
            model="smollm:135m",
            messages=[{"role": "user", "content": ollama_prompt}],
            options={"num_predict": 128},
        )
        content = response.get("message", {}).get("content", "").strip()

        import json
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)
        if "summary" in data and "possible_cause" in data:
            summary = data["summary"]
            possible_cause = data["possible_cause"]
    except Exception as e:
        logger.warning(f"Failed to generate LLM RCA via Ollama: {e}")
        # Rule-based fallback if Ollama fails
        if result.severity == "LOW":
            summary = "Current response embeddings align with baseline embeddings."
            possible_cause = "No significant topic shift detected."
        else:
            summary = "Current response embeddings diverge significantly from baseline embeddings."
            possible_cause = "Prompt distribution shifted to a different topic domain."

    return {
        "baseline_size": len(baseline_responses),
        "telemetry_size": len(current_responses),
        "severity": str(result.severity),
        "summary": summary,
        "baseline_examples": baseline_examples,
        "telemetry_examples": telemetry_examples,
        "possible_cause": possible_cause
    }


@app.get("/drift/agentic-rca")
def get_llm_agentic_rca():
    if not baseline_responses or not current_responses:
        if not baseline_responses:
            root_cause = "Baseline response pool is empty. Please set a baseline first."
            log_msg = "Triage Agent: Baseline responses empty. Aborted."
        else:
            root_cause = "No current telemetry responses collected. Please generate responses first."
            log_msg = "Triage Agent: Current telemetry responses empty. Aborted."
            
        return {
            "triage": {"severity": "LOW", "requires_investigation": False},
            "diagnosis": {
                "root_cause": root_cause,
                "confidence": 1.0,
                "evidence": "No responses in memory."
            },
            "recommendations": [
                "Investigate why user prompts/responses have not been recorded yet.",
                "Generate baseline and current responses to trigger analysis."
            ],
            "agent_collaboration_log": [log_msg],
            "metadata": {
                "baseline_size": len(baseline_responses),
                "telemetry_size": len(current_responses),
                "centroid_score": 0.0,
                "mmd_score": 0.0,
                "severity": "LOW"
            }
        }

    # Attempt to load baseline embeddings from Qdrant first
    try:
        stored = get_embeddings("baseline")
    except Exception as e:
        logger.warning(f"Failed to load baseline embeddings from Qdrant: {e}")
        stored = []

    if stored:
        base_emb = np.array(stored)
    else:
        base_emb = embed_texts(baseline_responses)

    curr_emb = embed_texts(current_responses)
    result = compute_drift(base_emb, curr_emb)

    metrics = {
        "centroid_score": float(result.centroid_score),
        "mmd_score": float(result.mmd_score),
        "severity": str(result.severity)
    }

    # Run multi-agent orchestrator
    from src.llm_monitoring.agents.orchestrator import run_agentic_rca
    report = run_agentic_rca(baseline_responses, current_responses, metrics)
    return report


# Touch to trigger uvicorn reload and clear memory state