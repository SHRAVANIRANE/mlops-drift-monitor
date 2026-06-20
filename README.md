# Driftium - MLOps Drift Monitor & LLM Observability Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![Qdrant](https://img.shields.io/badge/Qdrant-Active-red?style=flat)](https://qdrant.tech)
[![Ollama](https://img.shields.io/badge/Ollama-smollm%3A135m-orange?style=flat)](https://ollama.com)
[![pytest](https://img.shields.io/badge/pytest-passed-success?style=flat&logo=pytest)](https://docs.pytest.org)

Driftium is an open-source, recruiter-friendly MLOps telemetry console and LLM observability platform. It is designed to trace statistical feature drift in tabular data pipelines and semantic distribution shifts in Large Language Model (LLM) responses. By analyzing incoming production telemetry against reference baselines, Driftium translates abstract distribution deltas and topic shifts into developer-friendly, LLM-generated Root Cause Analysis (RCA) summaries.

---

## Overview

### What Problem the Project Solves
As machine learning models and LLMs run in production, they inevitably suffer from silent degradation. Shifted demographic distributions, system pipeline bugs, or changing prompt topics introduce **data drift** and **semantic drift**. Driftium detects these regressions before they corrupt downstream applications by providing:
*   **Continuous Statistical Alarms** for structured, tabular feature datasets.
*   **Semantic Observability** to detect topic shifts, vocabulary shifts, and system performance anomalies in LLM response distributions.
*   **Contextual Explanations** that translate raw numerical scores into natural language diagnostics using a local LLM agent.

### Key Objectives
*   **Tabular Diagnostics**: Detect continuous and categorical feature drift feature-by-feature using mathematical distribution tests.
*   **LLM Observability**: Monitor LLM semantic response variance by mapping outputs into high-dimensional vector spaces and analyzing population distances.
*   **Automated Root Cause Analysis (RCA)**: Explain *why* drift has occurred rather than just flagging that it happened, comparing telemetry patterns against stable baselines.
*   **Sandbox Experimentation**: Provide an interactive Playground to engineer prompts, generate real-time responses, and set stable baseline metrics.

### Brief Architecture Overview
Driftium features a single-server backend built with FastAPI that exposes two mounted subsystems: a legacy statistical data monitoring service and a semantic LLM observability application. The subsystems utilize Sentence Transformers (`all-MiniLM-L6-v2`) and a local Qdrant vector database to vectorize and store telemetry. The React frontend communicates with the unified server on port `8000` to render dynamic health indexes, stability trend lines, and sample comparisons.

---

## Features

### Implemented Features (Active in Codebase)
*   **LLM Observability Dashboard**:
    *   **Health Index**: A 100-point scale evaluating prompt-to-response alignment based on average cosine distance.
    *   **Maximum Mean Discrepancy (MMD)**: Kernel-based MMD scoring using Radial Basis Functions (RBF) to measure distribution-level semantic shifts.
    *   **Stability Trend Line**: Graph tracing the historical health index and MMD scores over the last 20 calculations.
    *   **Response Comparer**: Side-by-side view of active baseline responses vs. current telemetry responses.
*   **Interactive Prompt Playground**:
    *   **Direct Generation**: Send custom prompt instructions to local Ollama (`smollm:135m`) and view responses instantly.
    *   **Baseline Promotion**: Promote current telemetry response lists to the baseline pool with a single click (`POST /baseline`).
    *   **Auto-Sync**: Automatically refreshes the main dashboard telemetry state when a baseline is promoted or new responses are generated.
*   **Agentic AI Root Cause Analysis (RCA)**:
    *   **Collaborative Multi-Agent Flow**: Sequentially routes drift telemetry through specialized agents (**Triage Agent**, **Diagnosis Agent**, and **Recommendation Agent**) via an **Orchestrator** to compile a final structured RCA report.
    *   **Developer Trace Console**: Displays a retro, terminal-style step-by-step developer log of agent communication and reasoning directly in the UI.
    *   **Offline Fallbacks**: Graceful rule-based fallbacks default to statistical summaries if the Ollama daemon is offline or returns an invalid structure.
*   **Persistent SQLite Storage**:
    *   **Drift History Persistence**: Automatically persists calculated drift metrics to a local SQLite database (`drift_history.db`).
    *   **Auto-Recovery & Maintenance**: Automatically initializes tables on start and limits table size to the latest 1000 records. Timestamps are stored in UTC ISO format.
*   **Tabular Data Drift Monitoring**:
    *   **Kolmogorov-Smirnov (KS) Test**: Compares continuous/numeric fields to detect distribution variances.
    *   **Chi-Square & Cramer's V**: Evaluates categorical fields and ranks them by effect size.
    *   **Interactive Simulation**: Filters baseline demographics to simulate shifts (e.g. `age < 35`) or accepts custom CSV uploads.
    *   **Tabular LLM Explainer**: Summarizes flagged tabular drift anomalies in natural language.

### Planned Features (Roadmap)
*   **Persistent Prompt Pools**: Migrate raw in-memory response lists to a persistent database schema.
*   **Automated Scraper Cron Jobs**: Schedule background scrapers to pull model logs automatically instead of relying on manual playground generations.
*   **Alert Webhook Integrations**: Route critical drift severity alerts directly to Slack, Teams, or PagerDuty.

---

## Tech Stack

### Frontend
*   **Core**: React 18 (Functional components, hooks, local state mapping)
*   **Tooling**: Vite (Hot module reloading, dev server, compilation bundling)
*   **Styling**: Vanilla CSS (Modern dot-matrix theme, glassmorphic grids, custom cards)
*   **Icons**: Lucide React

### Backend
*   **Framework**: FastAPI (Asynchronous ASGI server routing)
*   **Web Server**: Uvicorn
*   **Data Processing**: Pandas, NumPy, SciPy (for Kolmogorov-Smirnov and Chi-square statistics)

### Database
*   **Vector Database**: Qdrant (Client running in local `:memory:` mode for prompt-response embedding comparisons)
*   **Relational Database**: SQLite for persistent historical drift logs (`drift_history.db`)
*   **Data Storage**: In-memory telemetry queues and persistent historical trend records

### MLOps / AI Components
*   **Embedding Pipeline**: Sentence Transformers (`all-MiniLM-L6-v2` generating 384-dimensional vector embeddings)
*   **Local LLM Host**: Ollama (`smollm:135m` footprint optimized to ~240MB RAM usage)
*   **Multi-Agent System**: Sequential agent orchestrator (Triage, Diagnosis, Recommendation agents)

### Infrastructure
*   **CI & Automation**: GitHub Actions workflow (automating linting, formatting, and unit tests)
*   **Testing**: Pytest framework (automated suite running 27 validation checks covering agents, DB persistence, and scorers)

---

## System Architecture

### Data Flow
1.  **Ingestion**: The user either loads a simulated demographic dataset, uploads a custom CSV, or executes prompts in the Playground.
2.  **Vectorization**: For LLM telemetry, the backend passes generated texts to the Sentence Transformer model to compute 384-dimensional vector embeddings.
3.  **Indexing**: Embeddings are stored in the Qdrant in-memory vector database, grouped by baseline and current telemetry pools.
4.  **Metric Computation**: The backend runs the Centroid Cosine Distance and MMD tests on the vector distributions.
5.  **RCA Generation**: If drift is present, the backend sends sample outputs to Ollama to summarize the semantic shift, falling back to a rule-based generator if Ollama is unreachable.
6.  **Visualization**: The React UI polls/fetches these endpoints and updates metrics, historical trends, and text cards dynamically.

### Component Interactions
```mermaid
graph TD
    User([User / Engineer]) -->|Interacts| UI[React Frontend Dashboard]
    UI -->|GET /drift & GET /samples| API[FastAPI Server :8000]
    UI -->|POST /generate| API
    UI -->|POST /baseline| API
    
    subgraph Tabular Telemetry
        API -->|Simulate / Upload| TabEngine[Tabular Drift Engine]
        TabEngine -->|KS & Chi-Square| Stats[SciPy / Pandas]
        TabEngine -->|RCA prompt| LLMExp[LLM Explainer]
    end

    subgraph LLM Telemetry
        API -->|GET /drift/rca| LlmRca[LLM RCA Handler]
        API -->|Ollama Client| Ollama[Ollama Server :11434]
        API -->|Text List| Embedder[Sentence Transformer]
        Embedder -->|Vectors| Qdrant[(Qdrant in-memory)]
        Qdrant -->|Retrieve| Scorer[Centroid & MMD Scorer]
        Scorer -->|Drift Scores| API
    end
    
    Ollama -->|smollm:135m| LlmRca
    Ollama -->|smollm:135m| API
```

---

### Project Structure

```text
mlops-drift-monitor/
├── frontend/                     # React / Vite SPA frontend
│   ├── src/
│   │   ├── App.jsx               # Dashboard application, layout grids, and sections
│   │   ├── api.js                # API client integration communicating with FastAPI
│   │   ├── main.jsx              # React app entry point
│   │   └── styles.css            # Dark theme styles, layouts, and animations
│   ├── package.json              # Frontend node packages & run scripts
│   └── vite.config.js            # Vite configurations
├── src/                          # Backend source code modules
│   ├── llm_monitoring/           # LLM Observability & Semantic Drift Engine
│   │   ├── agents/               # Multi-Agent RCA workflow package
│   │   │   ├── __init__.py
│   │   │   ├── triage_agent.py   # Analyzes numerical severity thresholds
│   │   │   ├── diagnosis_agent.py # Analyzes topic/semantic shift logs
│   │   │   ├── recommendation_agent.py # Formulates action recommendations
│   │   │   └── orchestrator.py   # Orchestrates sequential agent invocations
│   │   ├── api.py                # LLM API endpoints (/generate, /drift, /samples, /drift/rca)
│   │   ├── embedder.py           # Sentence Transformers embedding mapping
│   │   ├── llm_drift_scorer.py   # Centroid distance and MMD calculation
│   │   ├── simulator.py          # Standalone simulation testing logic
│   │   ├── inference_server.py   # Dedicated LLM completion server
│   │   └── vector_store.py       # In-memory Qdrant client utility
│   ├── monitoring/               # Tabular Feature Drift Engine
│   │   ├── api.py                # Main FastAPI Server app (with LLM sub-app mounted)
│   │   ├── drift_detection.py    # Statistical tests (KS, Chi2, Cramer's V)
│   │   └── service.py            # Data loading, payload building, and simulations
│   └── llm/                      # Tabular LLM RCA agent
│       └── llm_explainer.py      # Ollama helper for tabular RCA
├── tests/                        # Automated Pytest suite
│   ├── test_agentic_rca.py       # Unit tests for multi-agent RCA system
│   ├── test_drift_detection.py   # Statistical check validations
│   ├── test_vector_store.py      # Qdrant vector store upsert/retrieval checks
│   ├── test_monitoring_service.py # Tabular service integrations
│   └── test_persistence.py       # SQLite database persistence tests
├── main.py                       # CLI workflow entry point
├── pytest.ini                    # Pytest framework configurations
├── requirements.txt              # Python requirements and package list
```r service integrations
├── main.py                       # CLI workflow entry point
├── pytest.ini                    # Pytest framework configurations
└── requirements.txt              # Python requirements and package list
```

### Directory Explanation
*   `frontend/`: The client application. Built as a Single Page Application (SPA) using React, custom CSS, and Lucide React.
*   `src/llm_monitoring/`: Houses the LLM monitoring endpoints, Sentence Transformers embeddings pipeline, in-memory Qdrant client, and the Centroid/MMD scoring math.
*   `src/monitoring/`: Houses the main FastAPI server setup, mounting configurations, and statistical drift test pipelines for structured tabular data.
*   `src/llm/`: Hosts the prompt engineering models and agents that explain tabular data drift anomalies.
*   `tests/`: Verification scripts covering statistical accuracy, vector ingestion, and edge cases.

---

## Setup & Installation

### Prerequisites
*   **Python**: Version 3.10+
*   **Node.js**: Node 18+ (with `npm`)
*   **Ollama**: Installed and running locally. Run the model using:
    ```bash
    ollama pull smollm:135m
    ```

### Backend Setup
1.  Navigate to the root directory and create a virtual environment:
    ```bash
    python -m venv venv
    ```
2.  Activate the virtual environment:
    *   **Windows**:
        ```powershell
        .\venv\Scripts\activate
        ```
    *   **macOS/Linux**:
        ```bash
        source venv/bin/activate
        ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Frontend Setup
1.  Navigate to the `frontend` folder:
    ```bash
    cd frontend
    ```
2.  Install npm packages:
    ```bash
    npm install
    ```

### Environment Variables
To customize the connection URL, create a `.env` file in the `frontend` folder:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Running the Application
1.  Start the FastAPI backend server:
    ```bash
    uvicorn src.monitoring.api:app --reload --port 8000
    ```
2.  In a separate terminal, launch the React development server:
    ```bash
    cd frontend
    npm run dev
    ```
3.  Navigate to `http://127.0.0.1:5173` to view the Driftium Dashboard.

---

## API Endpoints

| Endpoint | Method | Purpose | Request Body | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | API status and availability check | None | `{"status": "ok", "generated_at": "..."}` |
| `/api/monitoring/simulated` | `GET` | Retrieve tabular simulated drift payload | Query parameters: `age_threshold` (int), `p_threshold` (float) | `{"generated_at": "...", "summary": {...}, "display_rows": [...]}` |
| `/api/monitoring/upload` | `POST` | Upload a custom CSV for tabular drift analysis | Binary CSV payload | `{"generated_at": "...", "summary": {...}, "display_rows": [...]}` |
| `/api/rca` | `POST` | Generate tabular RCA explaining numerical shifts | `{"feature": "balance", "drift_rows": [...], "incoming_source_description": "..."}` | `{"available": true, "content": "...", "error": null, "model": "..."}` |
| `/generate` | `POST` | Get LLM response completion and append to telemetry pool | `{"prompt": "text"}` | `{"id": "...", "prompt": "...", "response": "...", "timestamp": "..."}` |
| `/baseline` | `POST` | Promote current telemetry responses to the baseline pool | None | `{"message": "Baseline set successfully", "baseline_size": 4}` |
| `/drift` | `GET` | Calculate LLM semantic drift scores and append to history | None | `{"centroid_score": 0.22, "mmd_score": 0.05, "severity": "LOW", "timestamp": "..."}` |
| `/drift/history` | `GET` | Retrieve last 20 drift history calculation logs | None | `[{"timestamp": "...", "centroid_score": 0.22, "mmd_score": 0.05, "severity": "LOW"}]` |
| `/samples` | `GET` | Fetch active baseline and current telemetry text samples | None | `{"baseline": ["..."], "current": ["..."]}` |
| `/drift/rca` | `GET` | Compare response pools and return semantic topic shift analysis | None | `{"baseline_size": 4, "telemetry_size": 3, "severity": "CRITICAL", "summary": "...", "possible_cause": "..."}` |
| `/drift/agentic-rca` | `GET` | Execute the collaborative Multi-Agent RCA workflow and return structured report | None | `{"triage": {...}, "diagnosis": {...}, "recommendations": [...], "agent_collaboration_log": [...]}` |

---

## Drift Monitoring Workflow

### 1. Feature Drift Detection Flow (Tabular)
1.  **Ingest Production Batch**: Production telemetry data is ingested via simulated subsets (e.g. filtering age) or custom CSV uploads.
2.  **Numerical Statistics**: Continuous features are evaluated using the Kolmogorov-Smirnov (KS) test comparing incoming data to baseline reference data. Columns with a p-value below the target threshold (default `0.05`) are flagged.
3.  **Categorical Statistics**: Categorical features are analyzed with a Chi-square contingency test. Cramer's V is computed to rank the severity of the shift.
4.  **Tabular RCA**: Flagged columns are sent to the tabular LLM explainer where a prompt compiles reference ranges and current statistics to output a natural language explanation.

### 2. LLM Drift Evaluation Flow (Semantic)
1.  **Playground Ingestion**: Prompt logs are routed to `/generate` where the local Ollama instance outputs text responses and appends them to the telemetry pool.
2.  **Embedding Generation**: The baseline and current response pools are passed to the `all-MiniLM-L6-v2` encoder model, converting sentences into 384-dimensional dense vectors.
3.  **Vector Database Indexing**: Embeddings are stored in separate baseline and current collections in the in-memory Qdrant vector database.
4.  **Divergence Metric Scoring**:
    *   **Centroid Distance**: Computes the cosine distance between the mean vectors of the baseline and current populations.
    *   **Maximum Mean Discrepancy (MMD)**: Calculates kernel-based distribution distance to identify subtle structural variations.
5.  **Semantic RCA Summary**: The system triggers Ollama to compare text samples directly, identifying topic shifts, keyword deviations, or tone shifts.

---

## Screenshots / Demo

### Product Landing Page
<img width="1877" height="895" alt="image" src="https://github.com/user-attachments/assets/93833360-d8da-4946-9225-8150f4ffbca8" />
*A sleek dot-matrix dashboard landing layout demonstrating real-time health indicators and drift status.*

### LLM Observability Dashboard
![Driftium LLM Observatory](file:///c:/Users/Shravani/Desktop/Projects/mlops-drift-monitor/docs/llm_observability_placeholder.png)
*Visualizes semantic health scores, MMD metrics, active history trend lines, and the LLM-powered RCA summary.*

### Interactive Playground
![Driftium Playground](file:///c:/Users/Shravani/Desktop/Projects/mlops-drift-monitor/docs/playground_placeholder.png)
*Allows sandbox prompt testing, response generations, and baseline promotions.*

---

## Current Limitations
*   **Transient Memory Lifecycles**: Since Qdrant runs in-memory, restarting the backend server resets active baseline/telemetry response pools, but the computed trend history is now safely persisted in SQLite.
*   **Local Hardware Bottlenecks**: Processing completions on CPU/GPU via Ollama is subject to local compute latencies. However, the system's model footprint has been minimized to avoid resource exhaustion.

---

## Future Improvements
*   **Database Ingestion Layers**: SQLite database integration is implemented for drift history logs; future enhancements will extend this to persist raw response pools and baseline histories permanently.
*   **Asynchronous Inference Queues**: Introduce Celery or Redis queues to process prompt generations asynchronously, preventing request timeouts.
*   **Metric Alerting Rules**: Implement customizable drift severity thresholds to dispatch webhooks to production alerts automatically.

---

## Resume Highlights
*   **Built an End-to-End MLOps Drift Monitor & LLM Observability Platform** utilizing FastAPI, React (Vite), Sentence Transformers, and Qdrant to detect tabular and semantic drift in real-time.
*   **Designed a Collaborative Multi-Agent AI System** incorporating Triage, Diagnosis, and Recommendation agents orchestrated sequentially to automatically troubleshoot and explain semantic drift.
*   **Engineered Statistical Analysis Engines** in Python using SciPy to perform Kolmogorov-Smirnov (KS) and Chi-square contingency tests, flagging feature deviations in incoming dataset telemetry.
*   **Implemented High-Dimensional LLM Observability** by computing centroid cosine distance and Maximum Mean Discrepancy (MMD) scores over 384-dimensional response embeddings.
*   **Integrated Local LLM Agents** utilizing Ollama (`smollm:135m`) to compare response pools and perform automated, natural language Root Cause Analysis (RCA) on detected semantic anomalies.
*   **Designed a Robust Unified Server Architecture** using FastAPI sub-app mounting to bundle tabular and LLM observability engines under a single CORS configuration on port 8000.
*   **Authored Exhaustive Automated Test Suites** in Pytest validating vector database writes, statistical thresholds, agent orchestration, and SQLite persistence.

---

## Interview Talking Points

### Why the Project Was Built
ML and LLM deployments suffer from silent degradation. Standard APM tools (e.g. Datadog) monitor system status like CPU or latency, but cannot spot mathematical data drift or semantic topic shifts. Driftium was built to bridge this gap, giving AI engineers a unified visual dashboard that alerts on distribution shifts and provides prompt explanations of *why* the data shifted.

### Design Decisions
*   **Collaborative Multi-Agent Architecture**: Replaced the legacy single-prompt RCA with a collaborative multi-agent setup. Running specialized agents (Triage, Diagnosis, Recommendations) in sequence enforces separation of concerns, improves structured reasoning, and produces highly detailed next steps.
*   **Model Optimization for Local Hosts**: Shifted LLM reasoning from `phi3:mini` (2.2 GB) to `smollm:135m` (91 MB). This optimization reduced local memory usage from 3.8 GiB to 242 MiB RAM, preventing out-of-memory errors on evaluators' systems while maintaining execution latency under 1 second.
*   **Embedding Model Selection**: Sentence Transformers (`all-MiniLM-L6-v2`) was selected because it generates compact 384-dimensional vector embeddings, significantly reducing memory footprint and processing latency compared to larger models, while maintaining rich semantic density.
*   **FastAPI Sub-App Mounting**: Rather than managing multiple backend servers, ports, and CORS setups, mounting the LLM observatory at the root `/` of the tabular monitoring app enables single-port execution.
*   **Rule-Based Exception Handling**: LLM services hosted locally can be volatile. The RCA module detects Ollama timeouts or failure codes and gracefully falls back to deterministic rule-based analysis, ensuring high system uptime.

### Challenges Solved
*   **Stale Dashboard Telemetry Trends & SQLite Persistence**: Resolved a bug where the `/drift` evaluation endpoint generated metrics but failed to store them. Implemented a persistent SQLite database storage mechanism (`drift_history.db`) in the backend to record and load scores across server restarts, resolving the flat dashboard trend line and maintaining historical data.
*   **Playground Prop Desynchronization**: Fixed a frontend bug where the prompt playground component was not properly bound to the parent refresh context. Corrected the signature to accept and trigger the `reload` prop on successful generation/promotion, ensuring drift metrics refresh instantly on tab switch.
*   **Sub-App Route Conflicts**: Solved routing blockages by arranging endpoints such that specific static routes take precedence, while mounting the sub-app as a root-level fallback.

### Scalability Considerations
*   **Vector Query Scaling**: In production, querying vector distances over millions of runs can be slow. Implementing collection partitions and index HNSW graphs in Qdrant ensures sub-millisecond distance lookups.
*   **Batching Embeddings**: Rather than vectorizing incoming responses individually, batching text arrays before sending them to the encoder pipeline minimizes redundant GPU/CPU overhead.

---

## Author

Shravani Rane
MCA MET'27

## License

Driftium is released under the [MIT License](file:///c:/Users/Shravani/Desktop/Projects/mlops-drift-monitor/LICENSE).
