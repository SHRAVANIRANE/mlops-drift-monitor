# Project Learnings

Use this file as your running log while you build the project.

## How To Use This File

After each work session, add short notes under the current date:

- what you built
- what broke
- what you learned
- what decision you made and why
- what you want to do next

## Suggested Template

```md
## YYYY-MM-DD

### What I worked on
- 

### What I learned
- 

### Problems I hit
- 

### Decisions I made
- 

### Next step
- 
```

## Entries

## 2026-04-03

### What I worked on
- Set up the project structure for an MLOps drift monitoring project.
- Started notebook-based exploration with the bank marketing dataset.
- Logged an initial scikit-learn experiment with MLflow.

### What I learned
- MLflow can track model runs, metrics, parameters, and saved model artifacts locally.
- A simple notebook is enough to validate the first training workflow before moving logic into reusable Python modules.

### Problems I hit
- The repository structure is ready, but most Python modules are still placeholders and need implementation.

### Decisions I made
- Keep the notebook for early experimentation.
- Move stable logic later into `src/` modules.
- Maintain project learnings separately from the README.

### Next step
- Implement the first version of the training pipeline and evaluation flow.
