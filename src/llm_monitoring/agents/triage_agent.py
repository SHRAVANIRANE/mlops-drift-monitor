import ollama
import json
import logging

logger = logging.getLogger("llm_monitoring.agents.triage")

def run_triage_agent(drift_score: float, mmd_score: float) -> dict:
    """
    Evaluates centroid drift score and MMD score to classify severity and decide if investigation is needed.
    """
    prompt = f"""
    You are a Triage Agent monitoring LLM response drift.
    Analyze the following drift metrics:
    - Drift Score (Centroid Distance): {drift_score:.4f}
    - MMD (Maximum Mean Discrepancy) Score: {mmd_score:.4f}

    Based on these metrics, classify the drift severity exactly as one of: LOW, MEDIUM, HIGH, or CRITICAL.
    Determine if the system requires investigation (requires_investigation = true if severity is MEDIUM, HIGH, or CRITICAL, otherwise false).

    Format the response exactly as a JSON object with keys:
    - "severity" (string: "LOW", "MEDIUM", "HIGH", "CRITICAL")
    - "requires_investigation" (boolean: true, false)
    """

    try:
        response = ollama.chat(
            model="smollm:135m",
            messages=[{"role": "user", "content": prompt.strip()}],
            options={"num_predict": 64}
        )
        content = response.get("message", {}).get("content", "").strip()
        
        # Parse potential markdown fences
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)
        if "severity" in data and "requires_investigation" in data:
            return {
                "severity": str(data["severity"]).upper(),
                "requires_investigation": bool(data["requires_investigation"])
            }
    except Exception as e:
        logger.warning(f"Triage agent model call failed or returned invalid JSON: {e}. Using rule-based fallback.")

    # Rule-based fallback (aligned with compute_drift thresholds)
    severity = "LOW"
    if drift_score >= 0.5 or mmd_score >= 0.5:
        severity = "CRITICAL"
    elif drift_score >= 0.35 or mmd_score >= 0.35:
        severity = "HIGH"
    elif drift_score >= 0.20 or mmd_score >= 0.20:
        severity = "MEDIUM"

    return {
        "severity": severity,
        "requires_investigation": severity in ("MEDIUM", "HIGH", "CRITICAL")
    }
