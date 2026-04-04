import ollama

def generate_explanation(prompt):
    response=ollama.chat(
        model='phi3:mini',
        messages=[
            {'role':"user", "content":prompt}
        ]
    )
    return response['message']['content']