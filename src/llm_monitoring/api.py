from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List
import uuid
import logging
import ollama

# your modules
from src.llm_monitoring.embedder import embed_texts
from src.llm_monitoring.llm_drift_scorer import compute_drift

logger = logging.getLogger("llm_monitoring")

app = FastAPI(title="LLM Drift Monitoring API")

# -------------------------------
# 🔹 In-memory storage (for now)
# -------------------------------
baseline_responses = []
current_responses = []
drift_history = []


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
            model="phi3:mini",
            messages=[{"role": "user", "content": prompt}],
            options={"num_predict": 128},
        )
        content = response.get("message", {}).get("content", "").strip()
        if not content:
            raise ValueError("Empty response received from Ollama.")
        return content
    except Exception as e:
        logger.error(f"Ollama generation failed for prompt '{prompt}': {e}")
        raise HTTPException(
            status_code=503,
            detail="Ollama service is unavailable. Make sure 'ollama serve' is running and phi3:mini is installed."
        )


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
        "timestamp": datetime.utcnow()
    }


# -------------------------------
# 🔹 Endpoint 2: Set baseline
# -------------------------------
@app.post("/baseline")
def set_baseline():
    global baseline_responses

    baseline_responses = current_responses.copy()
    current_responses.clear()

    return {
        "message": "Baseline set successfully",
        "baseline_size": len(baseline_responses)
    }


# -------------------------------
# 🔹 Endpoint 3: Compute drift
# -------------------------------
@app.get("/drift")
def get_drift():
    if not baseline_responses or not current_responses:
        return {"error": "Need both baseline and current data"}

    # embeddings
    base_emb = embed_texts(baseline_responses)
    curr_emb = embed_texts(current_responses)

    # drift score
    result = compute_drift(base_emb, curr_emb)

    # store history
    drift_res = {
        "timestamp": datetime.utcnow(),
        "centroid_score": float(result.centroid_score),
        "mmd_score": float(result.mmd_score),
        "severity": str(result.severity)
    }
    drift_history.append(drift_res)

    return drift_res



# -------------------------------
# 🔹 Endpoint 4: Drift history
# -------------------------------
@app.get("/drift/history")
def get_history():
    return drift_history[-20:]  # last 20 points


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
            "baseline_size": len(baseline_responses),
            "telemetry_size": len(current_responses),
            "severity": "LOW",
            "summary": "Need both baseline and current data to perform RCA.",
            "baseline_examples": [],
            "telemetry_examples": [],
            "possible_cause": "No data available."
        }

    # Calculate drift
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
            model="phi3:mini",
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