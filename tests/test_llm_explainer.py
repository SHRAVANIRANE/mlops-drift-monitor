from src.llm import llm_explainer
from src.llm.llm_explainer import (
    UNAVAILABLE_MESSAGE,
    ExplanationResult,
    generate_explanation,
    generate_explanation_result,
)


def test_generate_explanation_result_returns_content_when_ollama_succeeds(monkeypatch):
    def fake_chat(**kwargs):
        return {"message": {"content": "Investigate the age shift."}}

    monkeypatch.setattr(llm_explainer.ollama, "chat", fake_chat)

    result = generate_explanation_result("prompt")

    assert result == ExplanationResult(
        available=True,
        content="Investigate the age shift.",
        error=None,
        model="phi3:mini",
    )


def test_generate_explanation_result_returns_unavailable_when_ollama_fails(monkeypatch):
    def fake_chat(**kwargs):
        raise RuntimeError("connection refused")

    monkeypatch.setattr(llm_explainer.ollama, "chat", fake_chat)

    result = generate_explanation_result("prompt")

    assert not result.available
    assert result.content == ""
    assert result.error == "connection refused"
    assert result.model == "phi3:mini"


def test_generate_explanation_string_wrapper_keeps_compatibility(monkeypatch):
    def fake_chat(**kwargs):
        raise RuntimeError("connection refused")

    monkeypatch.setattr(llm_explainer.ollama, "chat", fake_chat)

    output = generate_explanation("prompt")

    assert UNAVAILABLE_MESSAGE in output
    assert "connection refused" in output
