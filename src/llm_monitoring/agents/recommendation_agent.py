import ollama
import json
import logging

logger = logging.getLogger("llm_monitoring.agents.recommendation")

def is_valid_recommendation(text: str) -> bool:
    text = text.strip()
    if not text:
        return False
    # Reject strings that look like Python dictionaries or JSON objects
    if (text.startswith("{") and text.endswith("}")) or (text.startswith("[") and text.endswith("]")):
        return False
    if "key1" in text or "key2" in text or "key3" in text or "root_cause" in text or "evidence" in text:
        return False
    return True


def run_recommendation_agent(diagnosis_result: dict, severity: str = "LOW") -> dict:
    """
    Formulates a list of concrete recommendation actions based on diagnosis results and severity level.
    """
    severity_upper = str(severity).upper()
    if severity_upper not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        severity_upper = "LOW"

    # Define guidelines matching severity requirements
    guidelines = {
        "LOW": (
            "- No immediate action required.\n"
            "- Continue monitoring semantic stability.\n"
            "- Current responses remain aligned with baseline behavior."
        ),
        "MEDIUM": (
            "- Review recent prompt trends.\n"
            "- Monitor for continued drift growth.\n"
            "- Consider re-baselining if the change is intentional."
        ),
        "HIGH": (
            "- Investigate prompt distribution changes.\n"
            "- Review model/version changes.\n"
            "- Review upstream data source changes."
        ),
        "CRITICAL": (
            "- Immediate investigation required.\n"
            "- Audit prompts, model configuration, and upstream systems.\n"
            "- Escalate to operators."
        )
    }[severity_upper]

    prompt = f"""
    You are a Recommendation Agent.
    Given the following diagnosis of LLM response drift:
    - Severity Level: {severity_upper}
    - Root Cause: {diagnosis_result.get('root_cause', '')}
    - Evidence: {diagnosis_result.get('evidence', '')}
    - Confidence: {diagnosis_result.get('confidence', 0.0)}

    Suggest a list of concrete and practical next actions for the machine learning team.
    Your recommendations must align with these guidelines for {severity_upper} severity:
    {guidelines}

    Format the response exactly as a JSON object with key:
    - "recommendations" (a list of strings)

    Example output:
    {{
        "recommendations": [
            "Action item 1",
            "Action item 2"
        ]
    }}
    """

    # Enforce standard concrete fallback recommendations for each severity level
    fallbacks = {
        "LOW": [
            "No immediate action required.",
            "Continue monitoring semantic stability.",
            "Current responses remain aligned with baseline behavior."
        ],
        "MEDIUM": [
            "Review recent prompt trends.",
            "Monitor for continued drift growth.",
            "Consider re-baselining if the change is intentional."
        ],
        "HIGH": [
            "Investigate prompt distribution changes.",
            "Review model/version changes.",
            "Review upstream data source changes."
        ],
        "CRITICAL": [
            "Immediate investigation required.",
            "Audit prompts, model configuration, and upstream systems.",
            "Escalate to operators."
        ]
    }

    try:
        response = ollama.chat(
            model="smollm:135m",
            messages=[{"role": "user", "content": prompt.strip()}],
            options={"num_predict": 96}
        )
        content = response.get("message", {}).get("content", "").strip()

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)
        if "recommendations" in data and isinstance(data["recommendations"], list):
            recs = []
            for r in data["recommendations"]:
                if isinstance(r, dict):
                    # If item is a dict, extract text values from it
                    val = None
                    for key in ["action", "recommendation", "text", "value", "desc", "message"]:
                        if key in r and isinstance(r[key], str):
                            val = r[key]
                            break
                    if val is None:
                        for v in r.values():
                            if isinstance(v, str):
                                val = v
                                break
                    if val and is_valid_recommendation(val):
                        recs.append(val)
                elif isinstance(r, str) and is_valid_recommendation(r):
                    recs.append(r)

            if len(recs) >= 2:
                return {"recommendations": recs}
    except Exception as e:
        logger.warning(f"Recommendation agent model call failed or returned invalid JSON: {e}. Using fallback.")

    return {"recommendations": fallbacks[severity_upper]}
