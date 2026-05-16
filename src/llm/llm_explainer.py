from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import ollama


DEFAULT_MODEL = "phi3:mini"
UNAVAILABLE_MESSAGE = (
    "RCA is unavailable because Ollama is not running or the configured model could not be reached."
)


@dataclass(frozen=True)
class ExplanationResult:
    available: bool
    content: str
    error: str | None
    model: str


def _extract_message_content(response: Any) -> str:
    if isinstance(response, dict):
        message = response.get("message", {})
        if isinstance(message, dict):
            return str(message.get("content", "")).strip()
        return str(getattr(message, "content", "")).strip()

    message = getattr(response, "message", None)
    if isinstance(message, dict):
        return str(message.get("content", "")).strip()

    return str(getattr(message, "content", "")).strip()


def generate_explanation_result(prompt: str, model: str = DEFAULT_MODEL) -> ExplanationResult:
    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={"num_predict": 150},
        )
        content = _extract_message_content(response)

        if not content:
            return ExplanationResult(
                available=False,
                content="",
                error="Ollama returned an empty response.",
                model=model,
            )

        return ExplanationResult(
            available=True,
            content=content,
            error=None,
            model=model,
        )
    except Exception as error:
        return ExplanationResult(
            available=False,
            content="",
            error=str(error),
            model=model,
        )


def generate_explanation(prompt: str, model: str = DEFAULT_MODEL) -> str:
    result = generate_explanation_result(prompt, model=model)

    if result.available:
        return result.content

    return f"{UNAVAILABLE_MESSAGE} Details: {result.error}"
