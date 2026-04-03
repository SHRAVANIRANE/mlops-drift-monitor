# MLOps Drift Monitor

This repository is about building a small end-to-end drift monitoring workflow.

Right now the project is in active development. The current work includes:

- exploring the bank marketing dataset
- training a baseline scikit-learn pipeline
- tracking experiments with MLflow
- preparing modules for data logging, drift detection, model registry, and root cause analysis

## Project Goal

The aim is to build a practical monitoring setup that can:

- train and evaluate a baseline model
- log production-like data for monitoring
- detect data drift over time
- surface monitoring insights in a simple, reproducible workflow
- grow into a more complete MLOps portfolio project

## Current Status

- notebook exploration is started in `notebooks/exploration.ipynb`
- the dataset is available at `src/data/raw/bank-additional-full.csv`
- MLflow has already been used for experiment tracking locally
- the Python module structure is scaffolded, but most implementation files are still placeholders

## Current Tech Stack

- Python
- pandas
- scikit-learn
- MLflow
- Jupyter Notebook

## Project Structure

```text
mlops-drift-monitor/
|-- README.md
|-- main.py
|-- requirements.txt
|-- monitoring/
|   |-- data_logger.py
|   `-- drift_detection.py
|-- notebooks/
|   `-- exploration.ipynb
`-- src/
    |-- data/
    |   |-- raw/
    |   `-- processed/
    |-- features/
    |-- llm/
    |-- models/
    |-- monitoring/
    |-- registry/
    `-- utils/
```

### `docs/LEARNINGS.md` is focused on my personal learning journey.

## Notes

- `requirements.txt` is currently empty and should be filled as dependencies are finalized
- several source files are present as placeholders and can be documented as they are implemented
