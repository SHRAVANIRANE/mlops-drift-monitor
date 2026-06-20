import ollama
import json
import logging

logger = logging.getLogger("llm_monitoring.agents.recommendation")

def run_recommendation_agent(diagnosis_result: dict) -> dict:
    """
    Formulates exactly 2 concrete recommendation actions based on diagnosis results.
    """
    prompt = f"""
    You are a Recommendation Agent.
    Given the following diagnosis of LLM response drift:
    - Root Cause: {diagnosis_result.get('root_cause', '')}
    - Evidence: {diagnosis_result.get('evidence', '')}
    - Confidence: {diagnosis_result.get('confidence', 0.0)}

    Suggest exactly 2 concrete and practical next actions for the machine learning team.

    Format the response exactly as a JSON object with key:
    - "recommendations" (a list of 2 strings)
    """

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
            recs = [str(r) for r in data["recommendations"]][:2]
            if recs:
                return {"recommendations": recs}
    except Exception as e:
        logger.warning(f"Recommendation agent model call failed or returned invalid JSON: {e}. Using fallback.")

    # Fallback recommendations
    return {
        "recommendations": [
            "Investigate the user prompts and input distribution shift patterns.",
            "Establish a new baseline response pool if the semantic change is acceptable."
        ]
    }
