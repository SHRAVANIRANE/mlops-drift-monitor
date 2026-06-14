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