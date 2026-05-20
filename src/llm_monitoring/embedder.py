import os

from sentence_transformers import SentenceTransformer
import numpy as np

MODEL_NAME = os.getenv("EMBEDDER_MODEL", "all-MiniLM-L6-v2")
LOCAL_FILES_ONLY = os.getenv("EMBEDDER_LOCAL_FILES_ONLY", "1").lower() not in {
    "0",
    "false",
    "no",
}
_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(
            MODEL_NAME,
            local_files_only=LOCAL_FILES_ONLY,
        )
    return _model

def embed_texts(texts: list[str]) -> np.ndarray:
    return get_model().encode(texts)


if __name__ == "__main__":
    embeddings = embed_texts([
        "AI is powerful",
        "Cooking is fun"
    ])

    print(embeddings.shape)
