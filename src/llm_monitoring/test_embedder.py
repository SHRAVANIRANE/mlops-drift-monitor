from embedder import embed_texts

texts = [
    "AI is powerful",
    "Cooking is fun"
]

embeddings = embed_texts(texts)

print(embeddings.shape)