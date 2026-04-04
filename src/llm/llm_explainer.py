import ollama

def generate_explanation(prompt):
    
    try:
        response = ollama.chat(
            model='phi3:mini',
            messages=[
                {'role': "user", "content": prompt}
            ],
            options={"num_predict": 150}   # speed optimization
        )
        
        return response['message']['content']
    
    except Exception as e:
        return f"LLM Error: {str(e)}"