# Driftium - MLOps Drift Monitoring Console

Driftium is an end-to-end MLOps project for monitoring data drift in production-like ML batches. It compares a reference dataset against an incoming batch, detects numeric and categorical feature drift, surfaces feature-level diagnostics in a Streamlit dashboard, and uses a local Ollama LLM to generate a concise root-cause summary.

The project is built around the UCI Bank Marketing dataset and simulates a realistic monitoring incident by creating a shifted incoming batch.

## Why This Project Is Resume Worthy

- Built a reusable drift detection module with statistical tests for both numeric and categorical features.
- Designed an interactive Streamlit monitoring console with batch controls, feature diagnostics, report export, and RCA generation.
- Added LLM-assisted root-cause analysis using local Ollama prompts grounded in drift metrics.
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
|   |-- monitoring/
|   |   |-- data_logger.py
|   |   `-- drift_detection.py
|   |-- models/
|   |-- registry/
|   `-- utils/
`-- tests/
    `-- test_drift_detection.py
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

## Interview Talking Points

- Why KS test is useful for comparing numeric feature distributions.
- Why categorical drift needs a different statistical test than numeric drift.
- How effect size helps prioritize alerts beyond p-values.
- How to ground LLM RCA prompts in observed metrics to reduce hallucinations.
- How this could be extended with scheduled jobs, alerting, MLflow model metadata, and cloud deployment.

See [docs/RESUME_BRIEF.md](docs/RESUME_BRIEF.md) for concise resume bullets and a project explanation script.

## Author

Shravani Rane
