from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_texts(texts: list[str]) -> np.ndarray:
    return model.encode(texts)

embeddings = embed_texts([
    "AI is powerful",
    "Cooking is fun"
])

print(embeddings.shape)