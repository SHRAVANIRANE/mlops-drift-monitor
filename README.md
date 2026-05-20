# Driftium - MLOps Drift Monitoring Console

Driftium is an end-to-end MLOps project for monitoring data drift in production-like ML batches and LLM response streams. It compares a reference dataset against an incoming batch, detects numeric and categorical feature drift, surfaces feature-level diagnostics in a Streamlit dashboard, and uses a local Ollama LLM to generate a concise root-cause summary.

The project is built around the UCI Bank Marketing dataset for tabular drift, plus a lightweight LLM monitoring workflow that calls a local FastAPI/Ollama endpoint, embeds responses, stores vectors in Qdrant, and computes semantic drift.

## Add Ons

- Built a reusable drift detection module with statistical tests for both numeric and categorical features.
- Designed an interactive Streamlit monitoring console with batch controls, feature diagnostics, report export, and RCA generation.
- Added LLM-assisted root-cause analysis using local Ollama prompts grounded in drift metrics.
- Added LLM response drift monitoring with FastAPI, Ollama, Sentence Transformers embeddings, Qdrant vector storage, and centroid/MMD drift scoring.
- Added pytest coverage for core monitoring behavior.
- Added GitHub Actions CI so tests run automatically on pushes and pull requests.
- Structured the repo like a practical MLOps project, with room for MLflow, model registry, and deployment extensions.

## Core Capabilities

- Numeric drift detection with the two-sample Kolmogorov-Smirnov test.
- Categorical drift detection with chi-square contingency tests and Cramer's V effect size.
- Configurable drift p-value threshold.
- Simulated production batch generation through an age-based population shift.
- CSV upload flow for comparing custom incoming batches.
- Feature analysis views for distribution shifts and category mix changes.
- Local LLM RCA summaries through Ollama and `phi3:mini`.
- API-based LLM response simulation through FastAPI and Ollama.
- Semantic response embeddings with `all-MiniLM-L6-v2`.
- In-memory Qdrant vector storage for baseline and drifted response windows.
- LLM response drift scoring with centroid distance and MMD.
- Downloadable drift reports for audit and handoff.

## Architecture

```text
Reference Dataset
        |
        v
Incoming Batch
        |
        v
Feature Drift Detection
  - KS test for numeric features
  - Chi-square + Cramer's V for categorical features
        |
        v
Streamlit Monitoring Console
        |
        v
RCA Prompt Builder
        |
        v
Local Ollama Explanation
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
|-- app.py                         # Streamlit monitoring console
|-- main.py                        # CLI demo workflow
|-- requirements.txt
|-- docs/
|   |-- LEARNINGS.md
|   `-- RESUME_BRIEF.md
|-- notebooks/
|   `-- exploration.ipynb
|-- src/
|   |-- data/raw/
|   |   `-- bank-additional-full.csv
|   |-- llm/
|   |   |-- llm_explainer.py
|   |   `-- rca_agent.py
|   |-- llm_monitoring/
|   |   |-- embedder.py
|   |   |-- inference_server.py
|   |   |-- llm_drift_scorer.py
|   |   |-- simulator.py
|   |   `-- vector_store.py
|   |-- monitoring/
|   |   |-- data_logger.py
|   |   `-- drift_detection.py
|   |-- models/
|   |-- registry/
|   `-- utils/
`-- tests/
    |-- test_drift_detection.py
    |-- test_llm_explainer.py
    |-- test_main_cli.py
    |-- test_monitoring_service.py
    `-- test_vector_store.py
```

## Quickstart

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Run the dashboard:

```powershell
streamlit run app.py
```

Run the CLI workflow:

```powershell
python main.py
```

Run the LLM semantic drift simulator:

```powershell
ollama pull phi3:mini
python src/llm_monitoring/inference_server.py
```

In another terminal:

```powershell
python src/llm_monitoring/simulator.py
```

Run tests:

```powershell
pytest
```

## LLM Setup

The drift detection and dashboard work without Ollama. The RCA tab needs a local Ollama server.

```powershell
ollama pull phi3:mini
ollama serve
```

If Ollama is not running, the app returns a clear LLM connection error while the monitoring reports still work.

The LLM semantic drift simulator also needs the FastAPI inference server:

```powershell
python src/llm_monitoring/inference_server.py
```

The simulator stores embeddings in an in-memory Qdrant collection, so no external Qdrant service is required for the local demo. The embedder defaults to cached Hugging Face model files; set `EMBEDDER_LOCAL_FILES_ONLY=0` if you need to allow a first-time model download.

## Example Monitoring Scenario

The default dashboard flow compares the full reference dataset against a simulated incoming batch filtered by age:

```text
incoming_batch = reference_dataset[reference_dataset["age"] < 35]
```

This creates a controlled population shift. The system detects direct drift in `age` and secondary drift in correlated economic, demographic, and categorical features.

## Testing

The pytest suite covers:

- numeric drift detection
- stable numeric distributions
- categorical mix drift
- automatic object-column classification
- empty incoming numeric batches
- Qdrant vector storage and retrieval for LLM response embeddings

## Author

Shravani Rane
