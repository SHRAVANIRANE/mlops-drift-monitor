# Driftium - MLOps Drift Monitoring Console

Driftium is an end-to-end MLOps monitoring project for tabular feature drift and experimental LLM response drift. The current version pairs a FastAPI monitoring backend with a React/Vite frontend, using the UCI Bank Marketing dataset as the reference population for production-like batch monitoring.

The project also includes a CLI workflow that exports drift reports and can request local LLM-assisted root-cause analysis through Ollama when it is available.

## Latest Update

- Rebuilt the user experience as a React/Vite app with a product landing page and a multi-section monitoring dashboard.
- Added dashboard sections for overview metrics, drift analysis, prompt performance, token usage, and monitoring settings.
- Connected the frontend to FastAPI endpoints for simulated monitoring batches and CSV batch uploads.
- Added adjustable monitoring controls for incoming source, age cutoff, and p-value threshold.
- Kept a styled local snapshot in the frontend so the UI remains usable when the API is offline.
- Expanded the backend monitoring payload with summary metrics, sorted drift rows, top signal metadata, missing columns, and feature-level chart data.
- Kept CLI report export to `reports/drift_report.csv`.
- Added graceful Ollama fallback behavior for RCA, so tests and core monitoring do not require a running local model.

## Core Capabilities

- React dashboard for viewing monitoring health, drift severity, top signals, and monitoring tables.
- FastAPI monitoring API for health checks, simulated drift batches, uploaded CSV batches, and RCA generation.
- Numeric drift detection with the two-sample Kolmogorov-Smirnov test.
- Categorical drift detection with chi-square contingency tests and Cramer's V effect size.
- Configurable drift p-value threshold.
- Simulated production batch generation through an age-based population shift.
- CSV upload support for compatible incoming batches.
- Missing-column reporting for partial incoming batches.
- CLI workflow for drift detection, RCA prompt generation, and CSV report export.
- Optional local LLM RCA summaries through Ollama and `phi3:mini`.
- Experimental LLM response drift workflow with FastAPI, Ollama, Sentence Transformers, in-memory Qdrant, centroid distance, and MMD scoring.
- Pytest coverage for drift detection, monitoring service behavior, CLI smoke path, Ollama fallback behavior, and vector storage.

## Architecture

Tabular monitoring flow:

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
React Monitoring Dashboard
        |
        v
Drift Summary / Top Signal / Monitoring Table
```

CLI reporting flow:

```text
Reference Dataset + Simulated Batch
        |
        v
Monitoring Service
        |
        v
Console Output + reports/drift_report.csv
        |
        v
Optional Ollama RCA
```

Experimental LLM semantic drift flow:

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
In-memory Qdrant Vector Store
        |
        v
Centroid + MMD Drift Score
```

## Project Structure

```text
mlops-drift-monitor/
|-- frontend/                     # React/Vite frontend
|   |-- src/
|   |   |-- App.jsx               # Landing page and dashboard UI
|   |   |-- api.js                # FastAPI client helpers
|   |   `-- styles.css
|   |-- index.html
|   `-- package.json
|-- main.py                       # CLI demo workflow and report export
|-- requirements.txt
|-- docs/
|-- monitoring/                   # Legacy/import-compatible monitoring modules
|-- reports/
|   `-- drift_report.csv
|-- src/
|   |-- data/raw/
|   |   `-- bank-additional-full.csv
|   |-- llm/
|   |   |-- llm_explainer.py      # Ollama RCA wrapper
|   |   `-- rca_agent.py
|   |-- llm_monitoring/           # Experimental semantic drift prototype
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

Create and activate a Python environment:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Run the FastAPI monitoring backend:

```powershell
uvicorn src.monitoring.api:app --reload --port 8000
```

In another terminal, run the React frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the frontend at `http://127.0.0.1:5173`.

If the API runs somewhere else, set `VITE_API_BASE_URL` before starting Vite:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## API Endpoints

- `GET /api/health` - API health check.
- `GET /api/monitoring/simulated?age_threshold=35&p_threshold=0.05` - Build a monitoring payload from an age-filtered simulated batch.
- `POST /api/monitoring/upload?p_threshold=0.05` - Build a monitoring payload from an uploaded CSV batch.
- `POST /api/rca` - Generate a concise RCA response for a selected feature using local Ollama when available.

## CLI Workflow

Run the local CLI demo:

```powershell
python main.py
```

The CLI loads the Bank Marketing reference dataset, creates a simulated incoming batch where `age < 35`, prints drift results, optionally requests an RCA explanation from Ollama, and writes `reports/drift_report.csv`.

## LLM Setup

The FastAPI monitoring API and React dashboard work without Ollama. RCA and the experimental semantic drift simulator need a local Ollama server.

```powershell
ollama pull phi3:mini
ollama serve
```

If Ollama is not running, RCA returns a clear unavailable response while the monitoring report remains usable.

To run the experimental LLM response drift simulator, start the inference server:

```powershell
python src/llm_monitoring/inference_server.py
```

In another terminal:

```powershell
python src/llm_monitoring/simulator.py
```

The simulator stores embeddings in an in-memory Qdrant collection, so no external Qdrant service is required for the local demo. The embedder defaults to cached Hugging Face model files; set `EMBEDDER_LOCAL_FILES_ONLY=0` if you need to allow a first-time model download.

## Example Monitoring Scenario

The default simulated dashboard compares the full reference dataset against an incoming batch filtered by age:

```text
incoming_batch = reference_dataset[reference_dataset["age"] < 35]
```

This creates a controlled population shift. The system detects direct drift in `age` and can surface secondary movement in correlated economic, demographic, and categorical features.

## Testing

Run the full test suite:

```powershell
pytest
```

The suite covers:

- numeric drift detection
- stable numeric distributions
- categorical mix drift
- automatic object-column classification
- missing-column handling for partial incoming batches
- empty incoming batch validation
- mixed-type numeric incoming values
- Ollama success and unavailable paths
- CLI smoke path and report export
- Qdrant vector storage and retrieval for LLM response embeddings

## Author

Shravani Rane
