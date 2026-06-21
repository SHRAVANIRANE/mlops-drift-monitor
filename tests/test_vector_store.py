import numpy as np

from src.llm_monitoring.vector_store import (
    get_embeddings,
    init_collection,
    store_embeddings,
)


def test_get_embeddings_returns_vectors():
    import src.llm_monitoring.vector_store
    try:
        src.llm_monitoring.vector_store.get_client().close()
    except Exception:
        pass
    src.llm_monitoring.vector_store._client = None
    if src.llm_monitoring.vector_store.QDRANT_DIR.exists():
        import shutil
        shutil.rmtree(src.llm_monitoring.vector_store.QDRANT_DIR, ignore_errors=True)

    embeddings = np.array(
        [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
        ]
    )

    init_collection(vector_size=embeddings.shape[1], reset=True)
    store_embeddings(embeddings, "baseline")

    stored_embeddings = np.array(get_embeddings("baseline"))

    assert stored_embeddings.shape == embeddings.shape
    assert {
        tuple(vector) for vector in stored_embeddings
    } == {
        tuple(vector) for vector in embeddings
    }
