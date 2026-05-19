from fastapi import FastAPI
from pydantic import BaseModel
import ollama
from datetime import datetime

app = FastAPI()

class Prompt(BaseModel):
    text: str

@app.post("/generate")
async def generate(prompt: Prompt):
    try:
        # 🔹 Call LLM (Ollama)
        response = ollama.chat(
            model="phi3:mini",
            messages=[{"role": "user", "content": prompt.text}]
        )

        output_text = response["message"]["content"]

        # 🔹 Log (for now just print)
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
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)