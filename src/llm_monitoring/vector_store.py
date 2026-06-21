import uuid
import logging
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue
from qdrant_client.models import PointStruct, VectorParams

logger = logging.getLogger("llm_monitoring")

COLLECTION_NAME = "llm_embeddings"

import os
import sys

# Use a separate database path during testing to prevent polluting production data
is_testing = (
    "pytest" in sys.modules
    or "PYTEST_CURRENT_TEST" in os.environ
    or any("pytest" in arg or "unittest" in arg for arg in sys.argv)
)

if is_testing:
    QDRANT_DIR = Path(__file__).resolve().parents[2] / "qdrant_test_db"
else:
    QDRANT_DIR = Path(__file__).resolve().parents[2] / "qdrant_db"

QDRANT_DIR.mkdir(parents=True, exist_ok=True)

_client = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(path=str(QDRANT_DIR))
    return _client


def init_collection(vector_size: int = 384, reset: bool = False):
    c = get_client()
    if c.collection_exists(COLLECTION_NAME):
        if reset:
            c.delete_collection(COLLECTION_NAME)
            c.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            logger.info(f"Deleted and recreated Qdrant collection '{COLLECTION_NAME}' with vector size {vector_size}.")
        else:
            logger.info(f"Qdrant collection '{COLLECTION_NAME}' already exists. Reusing existing collection.")
    else:
        c.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        logger.info(f"Created new Qdrant collection '{COLLECTION_NAME}' with vector size {vector_size}.")


def store_embeddings(embeddings, label: str):
    points = []

    for emb in embeddings:
        vector = emb.tolist() if hasattr(emb, "tolist") else list(emb)
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"type": label}
            )
        )

    get_client().upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )


def get_embeddings(label: str):
    results = get_client().scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(
            must=[
                FieldCondition(
                    key="type",
                    match=MatchValue(value=label)
                )
            ]
        ),
        limit=100,
        with_vectors=True,
    )

    embeddings = []
    for point in results[0]:
        if point.vector is None:
            raise RuntimeError(
                "Qdrant returned a point without a vector. "
                "Make sure scroll() is called with with_vectors=True."
            )
        embeddings.append(point.vector)

    return embeddings
