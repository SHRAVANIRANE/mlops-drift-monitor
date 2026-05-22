# Driftium - MLOps Drift Monitoring Console

Driftium is an end-to-end MLOps project for monitoring data drift in production-like ML batches and LLM response streams. The tabular monitoring experience now runs as a React frontend backed by FastAPI, while the statistical drift logic stays in reusable Python service modules.

The project is built around the UCI Bank Marketing dataset for tabular drift, plus a lightweight LLM monitoring workflow that calls a local FastAPI/Ollama endpoint, embeds responses, stores vectors in Qdrant, and computes semantic drift.

## Core Capabilities

- React monitoring console with batch controls, feature diagnostics, RCA, and report export.
- FastAPI monitoring API for simulated batches, uploaded CSV batches, and RCA generation.
- Numeric drift detection with the two-sample Kolmogorov-Smirnov test.
- Categorical drift detection with chi-square contingency tests and Cramer's V effect size.
- Configurable drift p-value threshold.
- Simulated production batch generation through an age-based population shift.
- Local LLM RCA summaries through Ollama and `phi3:mini`.
- Semantic LLM response drift scoring with embeddings, Qdrant, centroid distance, and MMD.
- Pytest coverage for core monitoring behavior.

## Architecture

```text
Reference Dataset
        |
        v
Incoming Batch
        |
        v
FastAPI Monitoring API
        |
        v
React Monitoring Console
        |
        v
Feature Diagnostics / RCA / Report CSV
```

LLM semantic drift flow:

```text
Baseline Prompts        Drift Prompts
        |                    |
        v                    v
FastAPI /generate endpoint backed by Ollama
        |
        v
LLM Responses
        |
        v
Sentence Transformer Embeddings
        |
        v
Qdrant Vector Store
        |
        v
Centroid + MMD Drift Score
```

## Project Structure

```text
mlops-drift-monitor/
|-- frontend/                     # React/Vite monitoring console
|   |-- src/
|   |   |-- App.jsx
|   |   |-- api.js
|   |   `-- styles.css
|   |-- index.html
|   `-- package.json
|-- main.py                       # CLI demo workflow
|-- requirements.txt
|-- docs/
|-- src/
|   |-- data/raw/
|   |   `-- bank-additional-full.csv
|   |-- llm/
|   |-- llm_monitoring/
|   |-- monitoring/
|   |   |-- api.py                # FastAPI tabular monitoring API
|   |   |-- data_logger.py
|   |   |-- drift_detection.py
|   |   `-- service.py
|   |-- models/
|   |-- registry/
|   `-- utils/
`-- tests/
```

## Quickstart

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Run the FastAPI monitoring backend:

```powershell
uvicorn src.monitoring.api:app --reload --port 8000
```

Run the React frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the frontend at `http://127.0.0.1:5173`. If the API runs on another host, set `VITE_API_BASE_URL` before starting Vite.

Run the CLI workflow:

```powershell
python main.py
```

Run tests:

```powershell
pytest
```

## LLM Setup

The drift detection API and React console work without Ollama. The RCA view needs a local Ollama server.

```powershell
ollama pull phi3:mini
ollama serve
```

If Ollama is not running, the RCA endpoint returns a clear unavailable response while the monitoring report remains usable.

The LLM semantic drift simulator also needs the FastAPI inference server:

```powershell
python src/llm_monitoring/inference_server.py
```

In another terminal:

```powershell
python src/llm_monitoring/simulator.py
```

The simulator stores embeddings in an in-memory Qdrant collection, so no external Qdrant service is required for the local demo. The embedder defaults to cached Hugging Face model files; set `EMBEDDER_LOCAL_FILES_ONLY=0` if you need to allow a first-time model download.

## Example Monitoring Scenario

The default dashboard compares the full reference dataset against a simulated incoming batch filtered by age:

```text
incoming_batch = reference_dataset[reference_dataset["age"] < 35]
```

This creates a controlled population shift. The system detects direct drift in `age` and secondary drift in correlated economic, demographic, and categorical features.

## API Endpoints

- `GET /api/health`
- `GET /api/monitoring/simulated?age_threshold=35&p_threshold=0.05`
- `POST /api/monitoring/upload?p_threshold=0.05`
- `POST /api/rca`

## Author

Shravani Rane
