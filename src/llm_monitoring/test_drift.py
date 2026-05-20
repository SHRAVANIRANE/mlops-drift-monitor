from embedder import embed_texts
from llm_drift_scorer import compute_drift

# Baseline (same topic)
baseline_texts = [
    "How to cook pasta?",
    "Best recipe for cake",
    "How to bake bread?"
]

# Drifted (different topic)
current_texts = [
    "What is stock market?",
    "How to invest in crypto?",
    "Explain mutual funds"
]

baseline_embeddings = embed_texts(baseline_texts)
current_embeddings = embed_texts(current_texts)

result = compute_drift(baseline_embeddings, current_embeddings)

print(result)