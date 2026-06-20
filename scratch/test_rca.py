import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_rca_endpoints():
    print("--- Testing /api/rca (Tabular Drift RCA) ---")
    payload = {
        "drift_rows": [
            {
                "feature": "age",
                "feature_type": "numeric",
                "drift": True,
                "test": "ks_2samp",
                "drift_score": 0.45,
                "p_value": 0.001,
                "reference_count": 100,
                "incoming_count": 100,
                "reference_mean": 45.2,
                "incoming_mean": 32.1,
                "mean_delta": -13.1,
                "mean_shift_pct": -29.0,
                "reference_std": 10.0,
                "incoming_std": 8.0,
                "severity": "Critical"
            }
        ],
        "feature": "age",
        "incoming_source_description": "Incoming batch has lower ages than reference batch."
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/rca", json=payload)
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error calling /api/rca:", e)

    print("\n--- Testing /drift/rca (LLM Drift RCA) ---")
    try:
        # Before calling /drift/rca, we need some baseline and current responses.
        # Let's populate them just in case.
        requests.post(f"{BASE_URL}/generate", json={"prompt": "Describe machine learning"})
        requests.post(f"{BASE_URL}/generate", json={"prompt": "What is deep learning"})
        requests.post(f"{BASE_URL}/baseline")
        requests.post(f"{BASE_URL}/generate", json={"prompt": "Explain baking cookies"})
        requests.post(f"{BASE_URL}/generate", json={"prompt": "How to make a cake"})
        
        response = requests.get(f"{BASE_URL}/drift/rca")
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error calling /drift/rca:", e)

if __name__ == "__main__":
    test_rca_endpoints()
