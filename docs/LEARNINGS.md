# Project Learnings

Use this file as your running log while you build the project.

## How To Use This File

After each work session, add short notes under the current date:

- what you built
- what broke
- what you learned
- what decision you made and why
- what you want to do next

## Entries

## 2026-04-03

### What I worked on

- Set up project structure for Driftora (MLOps drift monitoring system)
- Loaded and explored UCI Bank Marketing dataset
- Built preprocessing pipeline using ColumnTransformer (numerical + categorical)
- Trained multiple models (Logistic Regression, Random Forest, Gradient Boosting)
- Integrated MLflow for experiment tracking and model logging
- Implemented model registry with versioning (v1 → v3)
- Simulated production drift by filtering dataset (`age < 35`)
- Built drift detection using KS test across numerical features
- Converted drift results into structured DataFrame (`drift_df`)
- Identified drifted features automatically
- Designed prompt for LLM-based root cause analysis
- Integrated local LLM using Ollama (`phi3:mini`)
- Generated drift explanation + recommended actions
- Refactored notebook code into modular Python files:
  - `drift.py`
  - `llm_explainer.py`
  - `main.py`

- Ran full pipeline using CLI (`python -m src.main`)

---

### What I learned

- Drift can propagate across correlated features, not just the one modified
- KS test is more reliable than simple statistics like mean comparison
- MLflow enables experiment tracking, comparison, and model versioning
- LLMs require structured prompts, not raw data, for meaningful output
- Prompt engineering significantly improves explanation quality
- Modular code design improves maintainability and debugging
- Local LLMs (Ollama) are resource-intensive and require optimization
- First LLM call is slow due to model loading (cold start problem)

---

### Problems I hit

- File path issues (`.scv` instead of `.csv`)
- MLflow runs not appearing due to incorrect tracking URI setup
- MLflow run errors due to incorrect ordering of configuration
- KeyError in drift detection due to overwriting dataframe with series
- Ollama responses slow or hanging due to limited RAM
- VS Code import error (`ollama` not resolved) due to wrong interpreter
- System lag when running ML + LLM together

---

### Decisions I made

- Use KS test for drift detection instead of heuristic methods
- Use local LLM (Ollama) instead of API for cost-free and offline capability
- Choose lightweight model (`phi3:mini`) due to hardware constraints
- Keep LLM as a separate module to allow future swapping (OpenAI, HF, etc.)
- Structure project into reusable modules instead of keeping everything in notebook
- Limit LLM output (`num_predict`) for performance optimization
- Use prompt constraints to avoid hallucinations

---

### Next step

- Add requirements.txt and finalize dependencies
- Improve output formatting (structured report format)
- Build simple UI (Streamlit) for demo
- Add alerting mechanism for drift detection
- Deploy project (local → cloud)
- Enhance LLM explanations with better prompt templates
- Prepare project for interviews (explanation + demo)
