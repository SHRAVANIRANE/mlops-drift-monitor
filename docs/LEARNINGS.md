# Project Learnings

## What I Built

- Set up Driftium as an MLOps drift monitoring project.
- Loaded and explored the UCI Bank Marketing dataset.
- Simulated production drift by filtering the incoming batch to younger customers.
- Built numeric drift detection with the two-sample KS test.
- Added categorical drift detection with chi-square contingency tests and Cramer's V.
- Converted drift outputs into a structured report with severity, p-values, sample counts, and shifted segments.
- Built a Streamlit monitoring console with overview, feature analysis, RCA, and report export views.
- Integrated local LLM explanations through Ollama and `phi3:mini`.
- Added pytest coverage for core monitoring behavior.
- Added GitHub Actions CI for automated test runs.

## What I Learned

- Drift can propagate across correlated features, not just the feature used to create the shift.
- KS tests work well for numeric distribution comparison, but categorical drift needs a separate test.
- P-values are useful for flagging drift, while effect sizes are better for prioritizing alerts.
- LLM RCA works best when the prompt includes structured evidence instead of raw data.
- Local LLMs are useful for offline demos, but they need graceful error handling because the server may not be running.
- A dashboard makes the project easier to explain because it shows the full monitoring workflow in one place.

## Problems I Hit

- File path issues while moving notebook logic into modules.
- MLflow setup order issues during early experiments.
- KeyErrors from overwriting a dataframe with a series during drift experiments.
- Ollama response latency and local resource constraints.
- Import errors caused by using the wrong virtual environment in VS Code.
- Documentation getting out of sync after the dashboard was added.

## Decisions I Made

- Use modular Python files instead of leaving the workflow only in notebooks.
- Keep the CLI flow in `main.py` for a quick terminal demo.
- Use Streamlit for a fast, interview-friendly monitoring interface.
- Keep the LLM integration isolated in `src/llm/llm_explainer.py` so it can be swapped later.
- Return structured drift reports instead of only printing drifted feature names.
- Add tests around the monitoring logic before expanding into deployment work.

## Next Steps

- Log drift reports into MLflow as artifacts.
- Add scheduled batch monitoring.
- Add alert routing for repeated or high-severity drift.
- Package the drift workflow as a reusable CLI command.
- Deploy the dashboard to a cloud environment.
