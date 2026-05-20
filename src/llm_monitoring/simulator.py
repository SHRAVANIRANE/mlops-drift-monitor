from embedder import embed_texts
from llm_drift_scorer import compute_drift


# -----------------------------
# Step 1: Baseline data
# -----------------------------
def generate_baseline():
    return [
        "How to cook pasta?",
        "Best recipe for cake",
        "How to bake bread?",
        "Easy breakfast ideas",
        "How to make pizza at home?"
    ]


# -----------------------------
# Step 2: Drifted data
# -----------------------------
def generate_drift():
    return [
        "What is stock market?",
        "How to invest in crypto?",
        "Explain mutual funds",
        "Best stocks to buy",
        "What is inflation?"
    ]


# -----------------------------
# Step 3: Run simulation
# -----------------------------
def run_simulation():
    print("\n--- Running Drift Simulation ---\n")

    baseline_texts = generate_baseline()
    current_texts = generate_drift()

    print("Baseline Sample:", baseline_texts[:2])
    print("Current Sample:", current_texts[:2])

    # Convert to embeddings
    baseline_embeddings = embed_texts(baseline_texts)
    current_embeddings = embed_texts(current_texts)

    # Compute drift
    result = compute_drift(baseline_embeddings, current_embeddings)

    print("\n--- Drift Result ---")
    print(f"Centroid Score: {result.centroid_score:.3f}")
    print(f"MMD Score: {result.mmd_score:.3f}")
    print(f"Severity: {result.severity}")
    print(f"Window Size: {result.window_size}")


# -----------------------------
# Run directly
# -----------------------------
if __name__ == "__main__":
    run_simulation()