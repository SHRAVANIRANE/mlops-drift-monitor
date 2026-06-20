from src.llm_monitoring.agents import triage_agent, diagnosis_agent, recommendation_agent
from src.llm_monitoring.agents.orchestrator import run_agentic_rca

# --- triage_agent tests ---

def test_triage_agent_success(monkeypatch):
    def mock_chat(*args, **kwargs):
        return {
            "message": {
                "content": '{"severity": "HIGH", "requires_investigation": true}'
            }
        }
    monkeypatch.setattr(triage_agent.ollama, "chat", mock_chat)

    res = triage_agent.run_triage_agent(0.4, 0.4)
    assert res == {
        "severity": "HIGH",
        "requires_investigation": True
    }

def test_triage_agent_fallback(monkeypatch):
    def mock_chat(*args, **kwargs):
        raise RuntimeError("Ollama offline")
    monkeypatch.setattr(triage_agent.ollama, "chat", mock_chat)

    # Centroid >= 0.5 should trigger CRITICAL
    res = triage_agent.run_triage_agent(0.55, 0.1)
    assert res == {
        "severity": "CRITICAL",
        "requires_investigation": True
    }

    # Centroid < 0.2 should trigger LOW
    res = triage_agent.run_triage_agent(0.1, 0.1)
    assert res == {
        "severity": "LOW",
        "requires_investigation": False
    }


# --- diagnosis_agent tests ---

def test_diagnosis_agent_success(monkeypatch):
    def mock_chat(*args, **kwargs):
        return {
            "message": {
                "content": '{"root_cause": "Semantic shift from ML to recipes", "confidence": 0.85, "evidence": "Baseline is about algorithms, telemetry is about baking"}'
            }
        }
    monkeypatch.setattr(diagnosis_agent.ollama, "chat", mock_chat)

    res = diagnosis_agent.run_diagnosis_agent(
        ["ML baseline"],
        ["Recipe telemetry"],
        {"centroid_score": 0.6, "mmd_score": 0.5, "severity": "CRITICAL"}
    )
    assert res == {
        "root_cause": "Semantic shift from ML to recipes",
        "confidence": 0.85,
        "evidence": "Baseline is about algorithms, telemetry is about baking"
    }

def test_diagnosis_agent_fallback(monkeypatch):
    def mock_chat(*args, **kwargs):
        raise ValueError("Invalid format")
    monkeypatch.setattr(diagnosis_agent.ollama, "chat", mock_chat)

    res = diagnosis_agent.run_diagnosis_agent(
        ["ML baseline"],
        ["Recipe telemetry"],
        {"centroid_score": 0.6, "mmd_score": 0.5, "severity": "CRITICAL"}
    )
    assert res["confidence"] == 0.75
    assert "diverge significantly" in res["root_cause"]


# --- recommendation_agent tests ---

def test_recommendation_agent_success(monkeypatch):
    def mock_chat(*args, **kwargs):
        return {
            "message": {
                "content": '{"recommendations": ["Refactor the classifier", "Gather new baselines"]}'
            }
        }
    monkeypatch.setattr(recommendation_agent.ollama, "chat", mock_chat)

    res = recommendation_agent.run_recommendation_agent({"root_cause": "ML shift", "confidence": 0.8})
    assert res == {
        "recommendations": ["Refactor the classifier", "Gather new baselines"]
    }

def test_recommendation_agent_fallback(monkeypatch):
    def mock_chat(*args, **kwargs):
        raise RuntimeError("Service unavailable")
    monkeypatch.setattr(recommendation_agent.ollama, "chat", mock_chat)

    res = recommendation_agent.run_recommendation_agent({"root_cause": "ML shift", "confidence": 0.8})
    assert len(res["recommendations"]) == 2
    assert "Establish a new baseline" in res["recommendations"][1]


# --- orchestrator tests ---

def test_orchestrator_integration(monkeypatch):
    def mock_chat(*args, **kwargs):
        prompt = kwargs.get("messages", [{}])[0].get("content", "")
        if "Triage Agent" in prompt:
            return {"message": {"content": '{"severity": "MEDIUM", "requires_investigation": true}'}}
        elif "Diagnosis Agent" in prompt:
            return {"message": {"content": '{"root_cause": "Topic shift to sport", "confidence": 0.9, "evidence": "Baseline is science, telemetry is hockey"}'}}
        elif "Recommendation Agent" in prompt:
            return {"message": {"content": '{"recommendations": ["Inspect sport category inputs", "Re-tune classification model"]}'}}
        return {"message": {"content": "{}"}}

    monkeypatch.setattr(triage_agent.ollama, "chat", mock_chat)

    report = run_agentic_rca(
        ["Science responses"],
        ["Sports responses"],
        {"centroid_score": 0.3, "mmd_score": 0.25}
    )

    assert report["triage"]["severity"] == "MEDIUM"
    assert report["triage"]["requires_investigation"] is True
    assert report["diagnosis"]["root_cause"] == "Topic shift to sport"
    assert report["diagnosis"]["confidence"] == 0.9
    assert len(report["recommendations"]) == 2
    assert len(report["agent_collaboration_log"]) == 3
    assert report["metadata"]["centroid_score"] == 0.3
