import requests
from embedder import embed_texts
from llm_drift_scorer import compute_drift
from requests import Response
from requests.exceptions import ConnectionError, HTTPError, RequestException, Timeout

API_URL = "http://127.0.0.1:8000/generate"
REQUEST_TIMEOUT_SECONDS = 30
PROMPTS_PER_GROUP = 2


# -----------------------------
# Call your FastAPI server
# -----------------------------
def parse_api_response(response: Response) -> str | None:
    try:
        data = response.json()
    except ValueError:
        print("API returned a non-JSON response.")
        return None

    if "response" not in data:
        print("API Error:", data)
        return None

    return data["response"]


def get_llm_response(prompt: str) -> str | None:
    try:
        print(f"Sending prompt: {prompt}")

        response = requests.post(
            API_URL,
            json={"text": prompt},
            timeout=(5, REQUEST_TIMEOUT_SECONDS),
        )
        response.raise_for_status()

        output = parse_api_response(response)
        if output is None:
            return None

        print("Received response.")
        return output

    except ConnectionError:
        print(
            "API server is not reachable. Start it in another terminal with: "
            "python src/llm_monitoring/inference_server.py"
        )
        return None
    except Timeout:
        print(
            f"API timed out after {REQUEST_TIMEOUT_SECONDS} seconds. "
            "Check that Ollama is running and that the model can respond."
        )
        return None
    except HTTPError as e:
        error_body = e.response.text if e.response is not None else str(e)
        print("API returned an error:", error_body)
        return None
    except RequestException as e:
        print("Request failed:", e)
        return None


def collect_responses(prompts: list[str], label: str) -> list[str]:
    print(f"Calling API for {label} responses...")
    responses = []

    for prompt in prompts:
        response = get_llm_response(prompt)
        if not response:
            raise RuntimeError(
                "Stopping simulation because the API did not return a response."
            )
        responses.append(response)

    return responses


# -----------------------------
# Baseline prompts
# -----------------------------
def generate_baseline_prompts():
    return [
        "How to cook pasta?",
        "Best recipe for cake",
        "How to bake bread?",
        "Easy breakfast ideas",
        "How to make pizza at home?"
    ]


# -----------------------------
# Drift prompts
# -----------------------------
def generate_drift_prompts():
    return [
        "What is stock market?",
        "How to invest in crypto?",
        "Explain mutual funds",
        "Best stocks to buy",
        "What is inflation?"
    ]


# -----------------------------
# Run simulation
# -----------------------------
def run_simulation():
    print("\n--- Running API-based Drift Simulation ---\n")

    baseline_prompts = generate_baseline_prompts()[:PROMPTS_PER_GROUP]
    drift_prompts = generate_drift_prompts()[:PROMPTS_PER_GROUP]

    baseline_responses = collect_responses(baseline_prompts, "baseline")
    drift_responses = collect_responses(drift_prompts, "drifted")

    # Convert to embeddings
    baseline_embeddings = embed_texts(baseline_responses)
    drift_embeddings = embed_texts(drift_responses)

    # Compute drift
    result = compute_drift(baseline_embeddings, drift_embeddings)

    print("\n--- Drift Result ---")
    print(f"Centroid Score: {result.centroid_score:.3f}")
    print(f"MMD Score: {result.mmd_score:.3f}")
    print(f"Severity: {result.severity}")
    print(f"Window Size: {result.window_size}")


# -----------------------------
# Run
# -----------------------------
if __name__ == "__main__":
    try:
        run_simulation()
    except RuntimeError as e:
        print(f"\nSimulation stopped: {e}")
