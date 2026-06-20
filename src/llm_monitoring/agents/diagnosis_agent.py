import ollama
import json
import logging

logger = logging.getLogger("llm_monitoring.agents.diagnosis")

def run_diagnosis_agent(baseline_responses: list[str], telemetry_responses: list[str], drift_metrics: dict) -> dict:
    """
    Diagnoses semantic response shift by comparing baseline and telemetry text responses.
    """
    baseline_examples = baseline_responses[:5]
    telemetry_examples = telemetry_responses[:5]

    prompt = f"""
    You are a Diagnosis Agent monitoring LLM response semantic drift.
    Compare the baseline responses with the current telemetry responses:

    Baseline Responses:
    {chr(10).join(f'- {r}' for r in baseline_examples)}

    Current Telemetry Responses:
    {chr(10).join(f'- {r}' for r in telemetry_examples)}

    Metrics:
    - Centroid Drift Score: {drift_metrics.get('centroid_score', 0.0):.4f}
    - MMD Score: {drift_metrics.get('mmd_score', 0.0):.4f}

    Compare the topics and generate:
    1. "root_cause": A 1-sentence description of the difference or semantic shift.
    2. "confidence": A float between 0.0 and 1.0 representing your diagnostic confidence.
    3. "evidence": A 1-sentence description of the textual evidence observed.

    Format the response exactly as a JSON object with keys:
    - "root_cause" (string)
    - "confidence" (float)
    - "evidence" (string)
    """

    try:
        response = ollama.chat(
            model="smollm:135m",
            messages=[{"role": "user", "content": prompt.strip()}],
            options={"num_predict": 128}
        )
        content = response.get("message", {}).get("content", "").strip()

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)
        if "root_cause" in data and "confidence" in data and "evidence" in data:
            return {
                "root_cause": str(data["root_cause"]),
                "confidence": float(data["confidence"]),
                "evidence": str(data["evidence"])
            }
    except Exception as e:
        logger.warning(f"Diagnosis agent model call failed or returned invalid JSON: {e}. Using fallback.")

    # Rule-based fallback
    severity = drift_metrics.get("severity", "LOW")
    if severity == "LOW":
        root_cause = "Current response embeddings align with baseline embeddings."
        evidence = f"No significant topic shift detected (Centroid Score: {drift_metrics.get('centroid_score', 0.0):.4f})."
        confidence = 0.90
    else:
        root_cause = "Current response embeddings diverge significantly from baseline embeddings."
        evidence = f"Significant topic/semantic shift detected (Centroid Score: {drift_metrics.get('centroid_score', 0.0):.4f})."
        confidence = 0.75

    return {
        "root_cause": root_cause,
        "confidence": confidence,
        "evidence": evidence
    }
