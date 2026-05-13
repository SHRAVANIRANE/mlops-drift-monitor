import html
import io
from datetime import datetime

import numpy as np
import pandas as pd
import streamlit as st

from src.llm.llm_explainer import generate_explanation
from src.monitoring.drift_detection import detect_drift


DATA_PATH = "src/data/raw/bank-additional-full.csv"


st.set_page_config(page_title="Driftium", layout="wide")
st.markdown(
    """
    <style>
    :root {
        --bg: #111315;
        --panel: #1A1E22;
        --panel-strong: #20262B;
        --accent: #00B4D8;
        --success: #2FBF71;
        --warning: #F5A524;
        --error: #F25F5C;
        --text: #F1F5F9;
        --muted: #A7B0BA;
        --border: #343B43;
    }

    [data-testid="stAppViewContainer"] {
        background: linear-gradient(180deg, #111315 0%, #15191D 100%);
        color: var(--text);
    }

    .block-container {
        max-width: 1220px;
        padding-top: 2rem;
        padding-bottom: 2rem;
    }

    h1, h2, h3, h4, h5, h6, p, label, span, div {
        color: inherit;
    }

    [data-testid="stSidebar"] {
        background: #15191D;
        border-right: 1px solid var(--border);
    }

    [data-testid="stSidebar"] * {
        color: var(--text);
    }

    div[data-testid="stMetric"] {
        background: rgba(26, 30, 34, 0.98);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.8rem 1rem;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
    }

    div[data-testid="stMetricLabel"] {
        color: var(--muted);
        font-weight: 600;
    }

    div[data-testid="stMetricValue"] {
        color: var(--text);
    }

    div[data-testid="stMetricDelta"] {
        color: var(--accent);
    }

    div[data-baseweb="tab-list"] {
        gap: 0.5rem;
    }

    button[data-baseweb="tab"] {
        background: rgba(26, 30, 34, 0.95);
        border-radius: 8px;
        color: #D7DEE6;
        border: 1px solid var(--border);
    }

    button[data-baseweb="tab"][aria-selected="true"] {
        background: rgba(0, 180, 216, 0.12);
        color: var(--accent);
        border-color: var(--accent);
        font-weight: 700;
    }

    button[kind="secondary"] {
        border-radius: 8px;
    }

    .stButton > button,
    .stDownloadButton > button {
        background: var(--accent);
        color: var(--bg);
        border: 1px solid var(--accent);
        border-radius: 8px;
        font-weight: 700;
        box-shadow: none;
    }

    .stButton > button:hover,
    .stDownloadButton > button:hover {
        background: #18C2E3;
        border-color: #18C2E3;
        color: var(--bg);
    }

    .hero-card {
        padding: 1.4rem 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(32, 38, 43, 0.98), rgba(26, 30, 34, 0.98));
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
        margin-bottom: 1rem;
    }

    .hero-alert {
        border-left: 4px solid var(--error);
    }

    .hero-stable {
        border-left: 4px solid var(--success);
    }

    .eyebrow {
        font-size: 0.8rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 0.5rem;
        font-weight: 700;
    }

    .hero-title {
        font-size: 2.2rem;
        line-height: 1.1;
        color: var(--text);
        margin: 0 0 0.4rem 0;
        font-weight: 700;
    }

    .hero-copy {
        font-size: 1rem;
        color: #D1D9E0;
        margin: 0 0 1rem 0;
        max-width: 860px;
    }

    .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        padding: 0.35rem 0.75rem;
        border-radius: 8px;
        background: rgba(167, 176, 186, 0.10);
        border: 1px solid rgba(167, 176, 186, 0.20);
        color: #D7DEE6;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .status-panel {
        padding: 1rem 1.1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border: 1px solid transparent;
    }

    .status-panel h3 {
        margin: 0 0 0.3rem 0;
        font-size: 1.05rem;
    }

    .status-panel p {
        margin: 0;
        color: #D1D9E0;
    }

    .status-alert {
        background: rgba(242, 95, 92, 0.10);
        border-color: rgba(242, 95, 92, 0.30);
    }

    .status-stable {
        background: rgba(47, 191, 113, 0.10);
        border-color: rgba(47, 191, 113, 0.28);
    }

    .insight-card {
        background: rgba(26, 30, 34, 0.98);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem 1.1rem;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
    }

    .insight-card h4 {
        margin: 0 0 0.5rem 0;
        color: var(--text);
    }

    .insight-card p,
    .insight-card li {
        color: #D1D9E0;
    }

    [data-testid="stDataFrame"] {
        background: rgba(26, 30, 34, 0.98);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
    }

    [data-testid="stExpander"] details {
        background: rgba(26, 30, 34, 0.98);
        border: 1px solid var(--border);
        border-radius: 8px;
    }

    [data-testid="stInfo"], [data-testid="stSuccess"], [data-testid="stWarning"], [data-testid="stError"] {
        border-radius: 8px;
    }

    [data-testid="stInfo"] {
        background: rgba(0, 180, 216, 0.12);
        border: 1px solid rgba(0, 180, 216, 0.35);
    }

    [data-testid="stSuccess"] {
        background: rgba(47, 191, 113, 0.12);
        border: 1px solid rgba(47, 191, 113, 0.35);
    }

    [data-testid="stWarning"] {
        background: rgba(245, 165, 36, 0.12);
        border: 1px solid rgba(245, 165, 36, 0.35);
    }

    [data-testid="stError"] {
        background: rgba(242, 95, 92, 0.12);
        border: 1px solid rgba(242, 95, 92, 0.35);
    }

    [data-baseweb="select"] > div,
    [data-baseweb="base-input"] {
        background: var(--panel) !important;
        border-color: var(--border) !important;
        color: var(--text) !important;
    }

    [data-baseweb="radio"] label,
    [data-baseweb="checkbox"] label {
        color: var(--text) !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def load_reference_data():
    return pd.read_csv(DATA_PATH, sep=";")


def read_uploaded_batch(uploaded_file):
    content = uploaded_file.getvalue()

    for separator in (None, ";"):
        try:
            if separator is None:
                candidate = pd.read_csv(io.BytesIO(content))
            else:
                candidate = pd.read_csv(io.BytesIO(content), sep=separator)
        except Exception:
            continue

        if candidate.shape[1] > 1:
            return candidate

    raise ValueError("Unable to read the uploaded CSV. Try a comma- or semicolon-separated file.")


def get_monitoring_feature_columns(df):
    feature_df = df.drop(columns=["y"], errors="ignore")
    numeric_columns = feature_df.select_dtypes(include=["number"]).columns.tolist()
    categorical_columns = feature_df.select_dtypes(exclude=["number"]).columns.tolist()
    return numeric_columns, categorical_columns


def simulate_incoming_batch(reference_df, age_threshold):
    return reference_df[reference_df["age"] < age_threshold].copy()


def summarize_numeric_feature(reference_df, incoming_df, feature_name):
    reference_feature = pd.to_numeric(reference_df[feature_name], errors="coerce").dropna()
    incoming_feature = pd.to_numeric(incoming_df[feature_name], errors="coerce").dropna()

    return {
        "reference_mean": reference_feature.mean(),
        "incoming_mean": incoming_feature.mean(),
        "reference_std": reference_feature.std(),
        "incoming_std": incoming_feature.std(),
        "reference_median": reference_feature.median(),
        "incoming_median": incoming_feature.median(),
    }


def summarize_categorical_feature(reference_df, incoming_df, feature_name):
    reference_counts = reference_df[feature_name].fillna("__missing__").astype(str).value_counts()
    incoming_counts = incoming_df[feature_name].fillna("__missing__").astype(str).value_counts()
    reference_top = reference_counts.index[0] if not reference_counts.empty else "n/a"
    incoming_top = incoming_counts.index[0] if not incoming_counts.empty else "n/a"

    return {
        "reference_top": reference_top,
        "incoming_top": incoming_top,
        "reference_top_share": (
            reference_counts.iloc[0] / reference_counts.sum() if not reference_counts.empty else np.nan
        ),
        "incoming_top_share": (
            incoming_counts.iloc[0] / incoming_counts.sum() if not incoming_counts.empty else np.nan
        ),
        "reference_unique": int(reference_counts.size),
        "incoming_unique": int(incoming_counts.size),
    }


def safe_percent_change(reference_value, incoming_value):
    if pd.isna(reference_value) or reference_value == 0:
        return np.nan

    return ((incoming_value - reference_value) / abs(reference_value)) * 100


def format_percent(value):
    return "n/a" if pd.isna(value) else f"{value * 100:.1f}%"


def format_score(value):
    return "n/a" if pd.isna(value) else f"{value:.3f}"


def classify_severity(row):
    score = row["drift_score"]

    if pd.isna(score):
        return "Low"
    if score >= 0.30:
        return "Critical"
    if score >= 0.20:
        return "High"
    if score >= 0.10:
        return "Medium"
    return "Low"


def describe_shift(row):
    if row["feature_type"] == "categorical":
        shifted_value = row.get("most_shifted_value")
        share_delta = row.get("share_delta")

        if not shifted_value or pd.isna(share_delta):
            return f"The incoming category mix for {row['feature']} is similar to the reference batch."

        direction = "increased" if share_delta > 0 else "decreased"
        return (
            f"The incoming share of '{shifted_value}' {direction} by "
            f"{abs(share_delta) * 100:.1f} percentage points for {row['feature']}."
        )

    mean_direction = "higher" if row["mean_delta"] > 0 else "lower"
    mean_gap = abs(row["mean_delta"])

    if pd.isna(row["reference_std"]) or pd.isna(row["incoming_std"]):
        spread_text = "spread comparison unavailable"
    elif row["incoming_std"] > row["reference_std"]:
        spread_text = "wider incoming spread"
    elif row["incoming_std"] < row["reference_std"]:
        spread_text = "tighter incoming spread"
    else:
        spread_text = "similar spread"

    return (
        f"The incoming batch shows a {mean_gap:.2f}-point {mean_direction} mean with a "
        f"{spread_text} for {row['feature']}."
    )


def build_drift_report(
    reference_df,
    incoming_df,
    numeric_columns,
    categorical_columns,
    p_threshold,
):
    monitored_columns = numeric_columns + categorical_columns
    drift_df = detect_drift(
        reference_df,
        incoming_df,
        monitored_columns,
        p_threshold=p_threshold,
        categorical_columns=categorical_columns,
    ).copy()

    numeric_summaries = {
        feature: summarize_numeric_feature(reference_df, incoming_df, feature)
        for feature in numeric_columns
    }

    drift_df["reference_mean"] = drift_df["feature"].map(
        lambda feature: numeric_summaries.get(feature, {}).get("reference_mean", np.nan)
    )
    drift_df["incoming_mean"] = drift_df["feature"].map(
        lambda feature: numeric_summaries.get(feature, {}).get("incoming_mean", np.nan)
    )
    drift_df["mean_delta"] = drift_df["incoming_mean"] - drift_df["reference_mean"]
    drift_df["mean_shift_pct"] = drift_df.apply(
        lambda row: safe_percent_change(row["reference_mean"], row["incoming_mean"]),
        axis=1,
    )
    drift_df["reference_std"] = drift_df["feature"].map(
        lambda feature: numeric_summaries.get(feature, {}).get("reference_std", np.nan)
    )
    drift_df["incoming_std"] = drift_df["feature"].map(
        lambda feature: numeric_summaries.get(feature, {}).get("incoming_std", np.nan)
    )
    drift_df["severity"] = drift_df.apply(classify_severity, axis=1)
    severity_order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    drift_df["severity_rank"] = drift_df["severity"].map(severity_order)

    return (
        drift_df.sort_values(
            ["drift", "severity_rank", "drift_score"],
            ascending=[False, False, False],
        )
        .drop(columns=["severity_rank"])
        .reset_index(drop=True)
    )


def build_histogram(reference_series, incoming_series, bins=18):
    reference_clean = pd.to_numeric(reference_series, errors="coerce").dropna()
    incoming_clean = pd.to_numeric(incoming_series, errors="coerce").dropna()
    combined = pd.concat([reference_clean, incoming_clean], ignore_index=True)

    if combined.empty:
        return pd.DataFrame(columns=["Reference", "Incoming"])

    if combined.nunique() == 1:
        value = combined.iloc[0]
        edges = np.array([value - 1, value, value + 1], dtype=float)
    else:
        edges = np.histogram_bin_edges(combined, bins=bins)

    reference_counts, _ = np.histogram(reference_clean, bins=edges)
    incoming_counts, _ = np.histogram(incoming_clean, bins=edges)

    labels = [
        f"{edges[index]:.1f} to {edges[index + 1]:.1f}"
        for index in range(len(edges) - 1)
    ]

    return pd.DataFrame(
        {
            "Reference": reference_counts,
            "Incoming": incoming_counts,
        },
        index=labels,
    )


def build_categorical_distribution(reference_series, incoming_series, max_categories=10):
    reference_counts = reference_series.fillna("__missing__").astype(str).value_counts()
    incoming_counts = incoming_series.fillna("__missing__").astype(str).value_counts()
    total_counts = reference_counts.add(incoming_counts, fill_value=0).sort_values(ascending=False)
    categories = total_counts.head(max_categories).index

    reference_share = (
        reference_counts.reindex(categories, fill_value=0) / max(reference_counts.sum(), 1)
    )
    incoming_share = incoming_counts.reindex(categories, fill_value=0) / max(incoming_counts.sum(), 1)

    return pd.DataFrame(
        {
            "Reference": reference_share * 100,
            "Incoming": incoming_share * 100,
        },
        index=categories,
    )


def format_feature_evidence(row):
    if row["feature_type"] == "categorical":
        return (
            f"- {row['feature']} ({row['feature_type']}): test={row['test']}, "
            f"cramers_v={row['drift_score']:.3f}, p_value={row['p_value']:.5f}, "
            f"most_shifted_value={row['most_shifted_value']}, "
            f"reference_share={format_percent(row['reference_share'])}, "
            f"incoming_share={format_percent(row['incoming_share'])}"
        )

    return (
        f"- {row['feature']} ({row['feature_type']}): test={row['test']}, "
        f"ks_stat={row['drift_score']:.3f}, p_value={row['p_value']:.5f}, "
        f"reference_mean={row['reference_mean']:.2f}, incoming_mean={row['incoming_mean']:.2f}"
    )


def build_rca_prompt(drift_df, focus_feature, incoming_source_description):
    focus_row = drift_df.loc[drift_df["feature"] == focus_feature].iloc[0]
    top_drifted = drift_df.loc[drift_df["drift"]].head(5)

    top_feature_lines = [format_feature_evidence(row) for _, row in top_drifted.iterrows()]

    if not top_feature_lines:
        top_feature_lines.append("- No features crossed the drift threshold.")

    return f"""
You are helping investigate feature drift for a bank marketing ML system.

Incoming batch source:
{incoming_source_description}

Focus feature:
{format_feature_evidence(focus_row)}

Top drifted features:
{chr(10).join(top_feature_lines)}

Instructions:
- Explain the most likely cause of the drift using only the evidence above.
- Distinguish the primary shifted feature from any secondary correlated features.
- Give exactly 2 practical next actions for an ML team.
- Keep the answer concise and grounded.
""".strip()


def build_display_table(report_df):
    rows = []

    for _, row in report_df.iterrows():
        status = "Alert" if row["drift"] else "Stable"

        if row["feature_type"] == "categorical":
            shifted_value = row["most_shifted_value"] or "n/a"
            reference_summary = f"{shifted_value}: {format_percent(row['reference_share'])}"
            incoming_summary = f"{shifted_value}: {format_percent(row['incoming_share'])}"
            shift = f"{row['share_delta'] * 100:+.1f} pp" if not pd.isna(row["share_delta"]) else "n/a"
        else:
            reference_summary = f"mean {row['reference_mean']:.2f}"
            incoming_summary = f"mean {row['incoming_mean']:.2f}"
            shift = (
                "n/a"
                if pd.isna(row["mean_shift_pct"])
                else f"{row['mean_delta']:+.2f} ({row['mean_shift_pct']:+.1f}%)"
            )

        rows.append(
            {
                "feature": row["feature"],
                "type": row["feature_type"],
                "status": status,
                "severity": row["severity"],
                "test": row["test"],
                "drift_score": format_score(row["drift_score"]),
                "p_value": f"{row['p_value']:.5f}",
                "reference": reference_summary,
                "incoming": incoming_summary,
                "shift": shift,
            }
        )

    return pd.DataFrame(rows)


def render_hero_banner(
    incoming_label,
    p_threshold,
    drifted_features,
    monitored_columns,
    numeric_count,
    categorical_count,
):
    tone_class = "hero-alert" if drifted_features else "hero-stable"
    summary_text = (
        f"{len(drifted_features)} of {len(monitored_columns)} monitored features are currently flagged."
    )
    chips = [
        f"Source: {incoming_label}",
        f"Threshold: p < {p_threshold:.3f}",
        f"Features: {numeric_count} numeric, {categorical_count} categorical",
    ]
    chip_html = "".join(f"<span class='chip'>{html.escape(chip)}</span>" for chip in chips)

    st.markdown(
        f"""
        <div class="hero-card {tone_class}">
            <div class="eyebrow">MLOps Monitoring</div>
            <h1 class="hero-title">Driftium Monitoring Console</h1>
            <p class="hero-copy">
                Compare an incoming batch with the reference dataset, inspect feature-level drift,
                and generate a grounded incident summary for model monitoring decisions.
            </p>
            <div class="chip-row">{chip_html}</div>
            <p class="hero-copy" style="margin-top: 1rem; margin-bottom: 0;">
                {html.escape(summary_text)}
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_status_panel(drift_df, drifted_features):
    top_row = drift_df.iloc[0]

    if drifted_features:
        title = "Drift requires attention"
        body = (
            f"Highest signal: {top_row['feature']} with {top_row['severity']} severity "
            f"({top_row['test']}, score {top_row['drift_score']:.3f}, "
            f"p-value {top_row['p_value']:.5f})."
        )
        css_class = "status-panel status-alert"
    else:
        title = "Current batch is stable"
        body = (
            f"No monitored feature crossed the drift threshold. Highest observed score "
            f"was {top_row['drift_score']:.3f} for {top_row['feature']}."
        )
        css_class = "status-panel status-stable"

    st.markdown(
        f"""
        <div class="{css_class}">
            <h3>{html.escape(title)}</h3>
            <p>{html.escape(body)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


reference_df = load_reference_data()
reference_numeric_columns, reference_categorical_columns = get_monitoring_feature_columns(reference_df)

st.sidebar.header("Monitoring Controls")
incoming_mode = st.sidebar.radio("Incoming batch source", ["Simulated batch", "Upload CSV"], index=0)
age_threshold = st.sidebar.slider(
    "Simulated age cutoff",
    min_value=20,
    max_value=60,
    value=35,
    disabled=incoming_mode == "Upload CSV",
)
p_threshold = st.sidebar.slider(
    "Drift p-value threshold",
    min_value=0.001,
    max_value=0.10,
    value=0.05,
    step=0.001,
)
uploaded_file = None

if incoming_mode == "Upload CSV":
    uploaded_file = st.sidebar.file_uploader("Upload incoming batch", type=["csv"])

if incoming_mode == "Upload CSV":
    if uploaded_file is None:
        st.info("Upload a CSV incoming batch to compare it against the reference dataset.")
        st.stop()

    try:
        incoming_df = read_uploaded_batch(uploaded_file)
        incoming_source_description = (
            "User-uploaded incoming batch. No extra business context was provided, so avoid unsupported claims."
        )
        incoming_label = "Uploaded batch"
        incoming_source_key = (
            getattr(uploaded_file, "name", "uploaded_batch"),
            getattr(uploaded_file, "size", 0),
        )
    except ValueError as error:
        st.error(str(error))
        st.stop()
else:
    incoming_df = simulate_incoming_batch(reference_df, age_threshold)
    incoming_source_description = (
        f"Simulated batch created by filtering the dataset to rows where age < {age_threshold}."
    )
    incoming_label = f"Simulated batch: age < {age_threshold}"
    incoming_source_key = ("simulated_batch", age_threshold)

if incoming_df.empty:
    st.warning("The incoming batch is empty. Adjust the controls or upload a different CSV.")
    st.stop()

numeric_columns = [column for column in reference_numeric_columns if column in incoming_df.columns]
categorical_columns = [
    column for column in reference_categorical_columns if column in incoming_df.columns
]
monitored_columns = numeric_columns + categorical_columns
missing_columns = [
    column
    for column in reference_numeric_columns + reference_categorical_columns
    if column not in incoming_df.columns
]

if not monitored_columns:
    st.error("No compatible feature columns were found in the incoming batch.")
    st.stop()

drift_df = build_drift_report(
    reference_df,
    incoming_df,
    numeric_columns,
    categorical_columns,
    p_threshold,
)
drifted_features = drift_df.loc[drift_df["drift"], "feature"].tolist()
focused_feature_default = drifted_features[0] if drifted_features else monitored_columns[0]
display_df = build_display_table(drift_df)
report_context_key = (
    incoming_mode,
    incoming_source_key,
    round(p_threshold, 3),
    tuple(drifted_features),
)

if st.session_state.get("report_context_key") != report_context_key:
    st.session_state.pop("rca_output", None)
    st.session_state.pop("rca_feature_name", None)
    st.session_state["report_context_key"] = report_context_key

render_hero_banner(
    incoming_label,
    p_threshold,
    drifted_features,
    monitored_columns,
    len(numeric_columns),
    len(categorical_columns),
)

overview_tab, feature_tab, rca_tab, reports_tab = st.tabs(
    ["Overview", "Feature Analysis", "RCA", "Reports"]
)

with overview_tab:
    render_status_panel(drift_df, drifted_features)

    drift_rate = len(drifted_features) / len(monitored_columns) if monitored_columns else 0
    metric_columns = st.columns(5)
    metric_columns[0].metric("Reference rows", f"{len(reference_df):,}")
    metric_columns[1].metric(
        "Incoming rows",
        f"{len(incoming_df):,}",
        delta=f"{len(incoming_df) - len(reference_df):,} vs ref",
    )
    metric_columns[2].metric("Monitored features", f"{len(monitored_columns)}")
    metric_columns[3].metric("Drifted features", f"{len(drifted_features)}")
    metric_columns[4].metric("Drift rate", f"{drift_rate:.0%}")

    if missing_columns:
        st.info(
            "Incoming batch is missing these reference columns: "
            + ", ".join(missing_columns)
        )

    st.subheader("Top drift signals")
    top_chart_df = drift_df.head(10).set_index("feature")[["drift_score"]]
    st.bar_chart(top_chart_df, use_container_width=True)

    st.subheader("Monitoring snapshot")
    st.dataframe(
        display_df,
        hide_index=True,
        use_container_width=True,
    )

with feature_tab:
    selected_feature = st.selectbox(
        "Inspect a feature",
        options=monitored_columns,
        index=monitored_columns.index(focused_feature_default),
    )

    selected_row = drift_df.loc[drift_df["feature"] == selected_feature].iloc[0]

    if selected_row["feature_type"] == "numeric":
        selected_summary = summarize_numeric_feature(reference_df, incoming_df, selected_feature)
        feature_metrics = st.columns(4)
        feature_metrics[0].metric("Reference mean", f"{selected_summary['reference_mean']:.2f}")
        feature_metrics[1].metric(
            "Incoming mean",
            f"{selected_summary['incoming_mean']:.2f}",
            delta=f"{selected_row['mean_delta']:.2f}",
        )
        feature_metrics[2].metric("Severity", selected_row["severity"])
        feature_metrics[3].metric("KS stat", f"{selected_row['drift_score']:.3f}")

        chart_column, insight_column = st.columns([1.7, 1.0])

        with chart_column:
            histogram_df = build_histogram(reference_df[selected_feature], incoming_df[selected_feature])
            st.subheader(f"Distribution comparison for {selected_feature}")
            st.bar_chart(histogram_df, use_container_width=True)

        with insight_column:
            drift_status = "Alert" if selected_row["drift"] else "Stable"
            shift_pct = (
                "n/a"
                if pd.isna(selected_row["mean_shift_pct"])
                else f"{selected_row['mean_shift_pct']:.1f}%"
            )
            st.markdown(
                f"""
                <div class="insight-card">
                    <h4>Feature health summary</h4>
                    <p><strong>Status:</strong> {html.escape(drift_status)}</p>
                    <p><strong>Severity:</strong> {html.escape(selected_row["severity"])}</p>
                    <p><strong>Shift summary:</strong> {html.escape(describe_shift(selected_row))}</p>
                    <p><strong>Reference median:</strong> {selected_summary["reference_median"]:.2f}</p>
                    <p><strong>Incoming median:</strong> {selected_summary["incoming_median"]:.2f}</p>
                    <p><strong>Relative mean shift:</strong> {html.escape(shift_pct)}</p>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        selected_summary = summarize_categorical_feature(reference_df, incoming_df, selected_feature)
        feature_metrics = st.columns(4)
        feature_metrics[0].metric("Reference top", selected_summary["reference_top"])
        feature_metrics[1].metric("Incoming top", selected_summary["incoming_top"])
        feature_metrics[2].metric("Severity", selected_row["severity"])
        feature_metrics[3].metric("Cramer's V", f"{selected_row['drift_score']:.3f}")

        chart_column, insight_column = st.columns([1.7, 1.0])

        with chart_column:
            category_df = build_categorical_distribution(
                reference_df[selected_feature],
                incoming_df[selected_feature],
            )
            st.subheader(f"Category mix comparison for {selected_feature}")
            st.bar_chart(category_df, use_container_width=True)

        with insight_column:
            drift_status = "Alert" if selected_row["drift"] else "Stable"
            st.markdown(
                f"""
                <div class="insight-card">
                    <h4>Feature health summary</h4>
                    <p><strong>Status:</strong> {html.escape(drift_status)}</p>
                    <p><strong>Severity:</strong> {html.escape(selected_row["severity"])}</p>
                    <p><strong>Shift summary:</strong> {html.escape(describe_shift(selected_row))}</p>
                    <p><strong>Reference top share:</strong> {format_percent(selected_summary["reference_top_share"])}</p>
                    <p><strong>Incoming top share:</strong> {format_percent(selected_summary["incoming_top_share"])}</p>
                    <p><strong>Unique values:</strong> {selected_summary["reference_unique"]} ref / {selected_summary["incoming_unique"]} incoming</p>
                </div>
                """,
                unsafe_allow_html=True,
            )

with rca_tab:
    rca_feature = st.selectbox(
        "Choose a feature to explain",
        options=monitored_columns,
        index=monitored_columns.index(focused_feature_default),
        key="rca_feature",
    )
    rca_row = drift_df.loc[drift_df["feature"] == rca_feature].iloc[0]

    st.markdown(
        f"""
        <div class="insight-card">
            <h4>RCA context</h4>
            <p><strong>Feature:</strong> {html.escape(rca_feature)}</p>
            <p><strong>Type:</strong> {html.escape(rca_row["feature_type"])}</p>
            <p><strong>Status:</strong> {"Alert" if rca_row["drift"] else "Stable"}</p>
            <p><strong>Severity:</strong> {html.escape(rca_row["severity"])}</p>
            <p><strong>Test / p-value:</strong> {html.escape(rca_row["test"])} / {rca_row["p_value"]:.5f}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.button("Generate explanation", use_container_width=True):
        with st.spinner("Generating RCA summary..."):
            rca_prompt = build_rca_prompt(drift_df, rca_feature, incoming_source_description)
            st.session_state["rca_output"] = generate_explanation(rca_prompt)
            st.session_state["rca_feature_name"] = rca_feature

    if "rca_output" in st.session_state:
        explained_feature = st.session_state.get("rca_feature_name", rca_feature)
        st.subheader(f"LLM explanation for {explained_feature}")
        st.write(st.session_state["rca_output"])
    else:
        st.info("Generate an explanation to see a concise RCA summary for the selected feature.")

with reports_tab:
    report_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_filename = f"drift_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    st.write(f"Report generated at: {report_timestamp}")

    report_df = drift_df.copy()
    st.dataframe(display_df, hide_index=True, use_container_width=True)

    st.download_button(
        label="Download drift report CSV",
        data=report_df.to_csv(index=False).encode("utf-8"),
        file_name=report_filename,
        mime="text/csv",
        use_container_width=True,
    )
