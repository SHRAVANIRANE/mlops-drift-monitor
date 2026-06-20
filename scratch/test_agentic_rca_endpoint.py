import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_agentic_rca():
    print("Populating responses to generate drift...")
    # Baseline responses:
    requests.post(f"{BASE_URL}/generate", json={"prompt": "Describe machine learning"})
    requests.post(f"{BASE_URL}/generate", json={"prompt": "What is deep learning"})
    requests.post(f"{BASE_URL}/baseline")
    
    # Telemetry responses (with topic shift to triggers high drift):
    requests.post(f"{BASE_URL}/generate", json={"prompt": "Best recipe for cookies"})
    requests.post(f"{BASE_URL}/generate", json={"prompt": "How to make a chocolate cake"})
    
    print("\nQuerying /drift/agentic-rca...")
    try:
        response = requests.get(f"{BASE_URL}/drift/agentic-rca")
        print("Status Code:", response.status_code)
        print("Agentic RCA Report:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error calling agentic RCA endpoint:", e)

if __name__ == "__main__":
    test_agentic_rca()
