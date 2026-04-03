# MLOps Drift Monitor

This repository is my hands-on MLOps learning project for building a small end-to-end drift monitoring workflow.

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

Based on the current repository contents:

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

## Suggested Build Order

If I keep updating this README as the project grows, this is a strong order to follow:

1. finish dataset exploration and target definition
2. implement feature engineering and training pipeline
3. evaluate baseline metrics
4. save or register the trained model
5. log incoming data batches
6. implement drift detection checks
7. add alerting or reporting
8. document lessons learned and tradeoffs

## Where To Write Learnings

Use `docs/LEARNINGS.md` as your running project journal.

That file is the best place for:

- what you built each day
- mistakes and debugging notes
- MLOps concepts you learned
- why you chose one approach over another
- things to improve later

Keep the README focused on the project overview, setup, architecture, and usage.
Keep `docs/LEARNINGS.md` focused on your personal learning journey.

## Next Documentation Updates To Add

As the codebase grows, I can keep updating this README with:

- setup instructions
- how to run training
- how to run drift checks
- model performance summary
- monitoring outputs
- screenshots or sample reports
- future improvements

## Notes

- `requirements.txt` is currently empty and should be filled as dependencies are finalized
- several source files are present as placeholders and can be documented as they are implemented
