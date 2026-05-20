import os
from datetime import datetime

import ollama
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3:mini")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "128"))
client = ollama.Client(timeout=OLLAMA_TIMEOUT_SECONDS)


class Prompt(BaseModel):
    text: str


@app.post("/generate")
def generate(prompt: Prompt):
    try:
        # Keep generation bounded so the simulator does not wait forever.
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt.text}],
            options={"num_predict": OLLAMA_NUM_PREDICT},
        )

        output_text = response["message"]["content"]

        print({
            "prompt": prompt.text,
            "response": output_text,
            "timestamp": str(datetime.now())
        })

        return {
            "prompt": prompt.text,
            "response": output_text
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama request failed: {e}",
        ) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
