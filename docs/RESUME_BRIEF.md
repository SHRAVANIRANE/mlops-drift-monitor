# Driftium Resume Brief

## One-Line Project Summary

Built an MLOps drift monitoring console that detects numeric and categorical feature drift, visualizes incoming batch shifts, exports drift reports, and generates LLM-assisted root-cause analysis using a local Ollama model.

## Resume Bullets

- Developed a Python and Streamlit MLOps dashboard for monitoring production-like data drift across numeric and categorical features.
- Implemented statistical drift detection using KS tests, chi-square contingency tests, Cramer's V effect size, and configurable p-value thresholds.
- Integrated local LLM-based root-cause analysis with Ollama to summarize drift signals and recommend ML remediation actions.
- Added report export, pytest coverage, and GitHub Actions CI for core monitoring logic, including numeric drift, categorical drift, type inference, and empty-batch handling.

## Interview Explanation

Driftium simulates a real model monitoring workflow. I use the Bank Marketing dataset as the reference population, generate an incoming batch with a controlled demographic shift, and compare both batches feature by feature. Numeric features are tested with the two-sample KS test, while categorical features are tested with a chi-square contingency test and prioritized with Cramer's V. The dashboard shows the top drift signals, lets the user inspect each feature, exports the report, and sends the grounded drift evidence to a local LLM for concise RCA.

## Technical Depth To Mention

- Different statistical tests are used for numeric and categorical data because the feature distributions have different shapes.
- P-values decide whether a feature is flagged, while effect sizes help rank alert severity.
- The LLM does not inspect raw data. It receives a structured prompt containing only drift evidence, which keeps the explanation grounded.
- The project can be extended into scheduled batch monitoring with model metadata, alert routing, and deployment to a cloud service.

## Next Upgrade Ideas

- Log drift reports into MLflow as monitoring artifacts.
- Add alert thresholds by feature importance or business priority.
- Package the monitoring logic as a reusable CLI.
