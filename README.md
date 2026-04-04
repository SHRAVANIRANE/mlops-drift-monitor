# Driftium

**Driftium** is an intelligent MLOps drift monitoring project that detects feature drift in production-like ML data and explains the likely root cause using a local LLM through Ollama.

---

## Problem

Machine learning systems can silently degrade when incoming data changes over time.

Traditional monitoring can tell us that drift happened, but it often does not answer the most useful question:

> Why did this drift happen, and what should we do next?

---

## Solution

Driftium combines:

- statistical drift detection using the KS test
- LLM-based explanation using Ollama
- a modular Python project structure for MLOps experimentation

---

## Current Workflow

The current implementation in [main.py](main.py) does the following:

1. loads the bank marketing dataset from `src/data/raw/bank-additional-full.csv`
2. creates a production-like dataset by filtering users with `age < 35`
3. detects drift on numeric features using the KS test
4. collects the drifted features
5. sends those features and summary statistics to a local Ollama model
6. prints a short root-cause explanation with recommended actions

---

## How It Works

```text
Reference Dataset
        ->
Simulated Production Slice
        ->
Feature-wise Drift Detection (KS Test)
        ->
Drifted Features
        ->
LLM Explanation via Ollama
        ->
Root Cause + Suggested Actions
```

---

## Current Features

- Detects numeric feature drift with SciPy KS test
- Returns feature-level drift statistics and p-values
- Identifies drifted columns automatically
- Uses Ollama with `phi3:mini` for explanation generation
- Simulates a realistic monitoring scenario with production-like data slicing
- Keeps the project modular for future monitoring and registry extensions

---

## Current Example Output

This is the current output pattern from the project run on April 4, 2026:

```text
Drifted features:
['age', 'emp.var.rate', 'cons.price.idx', 'cons.conf.idx', 'euribor3m', 'nr.employed']
```

```text
LLM Explanation:
The exact cause of the feature drift in 'age' is due to filtering out individuals older than 35 years from our dataset.
This artificially lowers the mean age value and shifts multiple related feature distributions.

Recommended actions:
1. Retrain or rebalance the data with broader age coverage.
2. Add continuous monitoring across demographic segments.
```

---

## Project Structure

```text
mlops-drift-monitor/
|-- main.py
|-- README.md
|-- requirements.txt
|-- docs/
|   `-- LEARNINGS.md
|-- notebooks/
|   `-- exploration.ipynb
`-- src/
    |-- data/
    |   `-- raw/
    |       `-- bank-additional-full.csv
    |-- llm/
    |   |-- llm_explainer.py
    |   `-- rca_agent.py
    |-- monitoring/
    |   |-- data_logger.py
    |   `-- drift_detection.py
    |-- models/
    |-- registry/
    `-- utils/
```

Core files right now:

- [main.py](main.py)
- [src/monitoring/drift_detection.py](src/monitoring/drift_detection.py)
- [src/llm/llm_explainer.py](src/llm/llm_explainer.py)
- [docs/LEARNINGS.md](docs/LEARNINGS.md)

---

## Tech Stack

- Python
- Pandas
- SciPy
- Ollama
- Jupyter Notebook
- Scikit-learn and MLflow for broader experimentation in the project

---

## How To Run

```powershell
# Clone the repo
git clone https://github.com/SHRAVANIRANE/mlops-drift-monitor.git
cd mlops-drift-monitor

# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Install current dependencies used by the project
pip install pandas scipy ollama scikit-learn mlflow jupyter

# Install the Ollama app/CLI locally, make sure it is running, then pull the model
ollama pull phi3:mini

# Run the project
python main.py
```

If Ollama is not running locally, the drift detection part will still work, but the explanation step can return an LLM connection error.

---

## What This Project Demonstrates

- practical drift detection in an ML monitoring workflow
- root-cause style explanation using an LLM
- modular project organization for MLOps systems
- experimentation with production-style debugging scenarios

---

## Learning Notes

Project learnings are tracked in [docs/LEARNINGS.md](docs/LEARNINGS.md).

That file is where I document:

- what I built
- what I learned
- debugging notes
- decisions and tradeoffs
- next steps

---

## Future Improvements

- support categorical drift detection
- log production batches through a real data logger
- add model registry integration
- build a Streamlit or React dashboard
- add alerts for repeated drift events
- support scheduled or real-time monitoring
- deploy the system to cloud infrastructure

---

## Author

Shravani Rane  

---

If you like this project, give it a star.
