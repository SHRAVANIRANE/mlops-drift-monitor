from src.llm_monitoring.agents import diagnosis_agent
import ollama

def mock_chat(*args, **kwargs):
    print("MOCK CHAT CALLED WITH KWARGS:", kwargs)
    return {"message": {"content": '{"root_cause": "Topic shift to sport", "confidence": 0.9, "evidence": "Baseline is science, telemetry is hockey"}'}}

# Attempt to patch ollama.chat
diagnosis_agent.ollama.chat = mock_chat

try:
    res = diagnosis_agent.run_diagnosis_agent(
        ["Science responses"],
        ["Sports responses"],
        {"centroid_score": 0.3, "mmd_score": 0.25}
    )
    print("RESULT:", res)
except Exception as e:
    import traceback
    print("EXCEPTION:")
    traceback.print_exc()
