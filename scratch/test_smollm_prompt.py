import ollama

prompt = """Analyze these two lists of LLM responses and identify if there is a topic/semantic shift between them:

Baseline:
- Machine learning is a subset of artificial intelligence...
- Deep learning is a neural network technique...

Current Telemetry:
- Baking cookies requires flour, sugar, butter...
- Making a cake is an art form that requires skill...

Compare the topics and generate:
1. A 1-sentence summary of the difference.
2. A 1-sentence possible cause for the shift.

Format the response exactly as a JSON object with keys "summary" and "possible_cause"."""

response = ollama.chat(
    model="smollm:135m",
    messages=[{"role": "user", "content": prompt}],
    options={"num_predict": 128}
)
print(response["message"]["content"])
