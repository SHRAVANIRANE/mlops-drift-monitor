import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue
from qdrant_client.models import PointStruct, VectorParams

COLLECTION_NAME = "llm_embeddings"

client = QdrantClient(":memory:")  # local in-memory (easy start)


def init_collection(vector_size: int = 384):
    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )


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

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )


def get_embeddings(label: str):
    results = client.scroll(
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
