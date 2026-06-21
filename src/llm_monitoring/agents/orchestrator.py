from src.llm_monitoring.agents.triage_agent import run_triage_agent
from src.llm_monitoring.agents.diagnosis_agent import run_diagnosis_agent
from src.llm_monitoring.agents.recommendation_agent import run_recommendation_agent

def run_agentic_rca(baseline_responses: list[str], telemetry_responses: list[str], drift_metrics: dict) -> dict:
    """
    Runs the agentic triage, diagnosis, and recommendation agents sequentially.
    """
    # 1. Triage Agent
    triage_res = run_triage_agent(drift_metrics.get("centroid_score", 0.0), drift_metrics.get("mmd_score", 0.0))

    # 2. Diagnosis Agent
    diagnosis_res = run_diagnosis_agent(baseline_responses, telemetry_responses, drift_metrics)

    # 3. Recommendation Agent
    recommendation_res = run_recommendation_agent(diagnosis_res, severity=triage_res.get("severity", "LOW"))

    # Build collaboration log trace
    collaboration_log = [
        f"Triage Agent: Evaluated metrics (centroid={drift_metrics.get('centroid_score', 0.0):.4f}, mmd={drift_metrics.get('mmd_score', 0.0):.4f}). Assigned {triage_res['severity']} severity. Investigation required: {triage_res['requires_investigation']}.",
        f"Diagnosis Agent: Analysed semantic shift. Identified root cause: '{diagnosis_res['root_cause']}' with confidence {diagnosis_res['confidence']:.2f}.",
        f"Recommendation Agent: Formulated action items: {', '.join(recommendation_res['recommendations'])}."
    ]

    # Combine into a structured report
    report = {
        "triage": triage_res,
        "diagnosis": diagnosis_res,
        "recommendations": recommendation_res["recommendations"],
        "agent_collaboration_log": collaboration_log,
        "metadata": {
            "baseline_size": len(baseline_responses),
            "telemetry_size": len(telemetry_responses),
            "centroid_score": drift_metrics.get("centroid_score", 0.0),
            "mmd_score": drift_metrics.get("mmd_score", 0.0),
            "severity": triage_res["severity"]
        }
    }

    return report
