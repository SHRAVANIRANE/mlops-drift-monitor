import io
import html
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
        --bg: #0E1117;
        --card: #1A1F2B;
        --accent: #00C2FF;
        --success: #22C55E;
        --error: #EF4444;
        --text: #E5E7EB;
        --muted: #94A3B8;
        --border: #2C3445;
    }

    [data-testid="stAppViewContainer"] {
        background:
            linear-gradient(180deg, #0E1117 0%, #11161f 100%);
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
        background: linear-gradient(180deg, #121722 0%, #0E1117 100%);
        border-right: 1px solid var(--border);
    }

    [data-testid="stSidebar"] * {
        color: var(--text);
    }

    div[data-testid="stMetric"] {
        background: rgba(26, 31, 43, 0.96);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.8rem 1rem;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
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
        background: rgba(26, 31, 43, 0.82);
        border-radius: 10px;
        color: #cbd5e1;
        border: 1px solid var(--border);
    }

    button[data-baseweb="tab"][aria-selected="true"] {
        background: rgba(0, 194, 255, 0.10);
        color: var(--accent);
        border-color: var(--accent);
        font-weight: 700;
    }

    button[kind="secondary"] {
        border-radius: 10px;
    }

    .stButton > button,
    .stDownloadButton > button {
        background: var(--accent);
        color: var(--bg);
        border: 1px solid var(--accent);
        border-radius: 10px;
        font-weight: 700;
        box-shadow: none;
    }

    .stButton > button:hover,
    .stDownloadButton > button:hover {
        background: #0bb6ea;
        border-color: #0bb6ea;
        color: var(--bg);
    }

    .hero-card {
        padding: 1.4rem 1.5rem;
        border-radius: 16px;
        border: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(26, 31, 43, 0.98), rgba(20, 25, 36, 0.98));
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
        color: #c7d2de;
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
        background: rgba(148, 163, 184, 0.10);
        border: 1px solid rgba(148, 163, 184, 0.18);
        color: #cbd5e1;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .status-panel {
        padding: 1rem 1.1rem;
        border-radius: 12px;
        margin-bottom: 1rem;
        border: 1px solid transparent;
    }

    .status-panel h3 {
        margin: 0 0 0.3rem 0;
        font-size: 1.05rem;
    }

    .status-panel p {
        margin: 0;
        color: #cbd5e1;
    }

    .status-alert {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.28);
    }

    .status-stable {
        background: rgba(34, 197, 94, 0.08);
        border-color: rgba(34, 197, 94, 0.24);
    }

    .insight-card {
        background: rgba(26, 31, 43, 0.96);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1rem 1.1rem;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
    }

    .insight-card h4 {
        margin: 0 0 0.5rem 0;
        color: var(--text);
    }

    .insight-card p,
    .insight-card li {
        color: #cbd5e1;
    }

    [data-testid="stDataFrame"] {
        background: rgba(26, 31, 43, 0.96);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
    }

    [data-testid="stExpander"] details {
        background: rgba(26, 31, 43, 0.96);
        border: 1px solid var(--border);
        border-radius: 12px;
    }

    [data-testid="stInfo"], [data-testid="stSuccess"], [data-testid="stWarning"], [data-testid="stError"] {
        border-radius: 16px;
    }

    [data-testid="stInfo"] {
        background: rgba(0, 194, 255, 0.12);
        border: 1px solid rgba(0, 194, 255, 0.35);
    }

    [data-testid="stSuccess"] {
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.35);
    }

    [data-testid="stWarning"] {
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.35);
    }

    [data-testid="stError"] {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.35);
    }

    [data-baseweb="select"] > div,
    [data-baseweb="base-input"] {
        background: var(--card) !important;
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


def get_numeric_feature_columns(df):
    feature_df = df.drop(columns=["y"], errors="ignore")
    return feature_df.select_dtypes(include=["int64", "float64"]).columns.tolist()


def simulate_incoming_batch(reference_df, age_threshold):
    return reference_df[reference_df["age"] < age_threshold].copy()


def summarize_feature(reference_df, incoming_df, feature_name):
    reference_feature = reference_df[feature_name].dropna()
    incoming_feature = incoming_df[feature_name].dropna()

    return {
        "reference_mean": reference_feature.mean(),
        "incoming_mean": incoming_feature.mean(),
        "reference_std": reference_feature.std(),
        "incoming_std": incoming_feature.std(),
        "reference_median": reference_feature.median(),
        "incoming_median": incoming_feature.median(),
    }


def safe_percent_change(reference_value, incoming_value):
    if pd.isna(reference_value) or reference_value == 0:
        return np.nan

    return ((incoming_value - reference_value) / abs(reference_value)) * 100


def classify_severity(ks_stat):
    if ks_stat >= 0.30:
        return "Critical"
    if ks_stat >= 0.20:
        return "High"
    if ks_stat >= 0.10:
        return "Medium"
    return "Low"


def describe_shift(row):
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


def build_drift_report(reference_df, incoming_df, monitored_columns, p_threshold):
    drift_df = detect_drift(
        reference_df,
        incoming_df,
        monitored_columns,
        p_threshold=p_threshold,
    ).copy()

    feature_summaries = {
        feature: summarize_feature(reference_df, incoming_df, feature)
        for feature in monitored_columns
    }

    drift_df["reference_mean"] = drift_df["feature"].map(
        lambda feature: feature_summaries[feature]["reference_mean"]
    )
    drift_df["incoming_mean"] = drift_df["feature"].map(
        lambda feature: feature_summaries[feature]["incoming_mean"]
    )
    drift_df["mean_delta"] = drift_df["incoming_mean"] - drift_df["reference_mean"]
    drift_df["mean_shift_pct"] = drift_df.apply(
        lambda row: safe_percent_change(row["reference_mean"], row["incoming_mean"]),
        axis=1,
    )
    drift_df["reference_std"] = drift_df["feature"].map(
        lambda feature: feature_summaries[feature]["reference_std"]
    )
    drift_df["incoming_std"] = drift_df["feature"].map(
        lambda feature: feature_summaries[feature]["incoming_std"]
    )
    drift_df["severity"] = drift_df["ks_stat"].apply(classify_severity)

    return drift_df.sort_values(["drift", "ks_stat"], ascending=[False, False]).reset_index(drop=True)


def build_histogram(reference_series, incoming_series, bins=18):
    combined = pd.concat([reference_series.dropna(), incoming_series.dropna()], ignore_index=True)

    if combined.empty:
        return pd.DataFrame(columns=["Reference", "Incoming"])

    if combined.nunique() == 1:
        value = combined.iloc[0]
        edges = np.array([value - 1, value, value + 1], dtype=float)
    else:
        edges = np.histogram_bin_edges(combined, bins=bins)

    reference_counts, _ = np.histogram(reference_series.dropna(), bins=edges)
    incoming_counts, _ = np.histogram(incoming_series.dropna(), bins=edges)

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


def build_rca_prompt(drift_df, focus_feature, incoming_source_description):
    focus_row = drift_df.loc[drift_df["feature"] == focus_feature].iloc[0]
    top_drifted = drift_df.loc[drift_df["drift"]].head(5)

    top_feature_lines = []
    for _, row in top_drifted.iterrows():
        top_feature_lines.append(
            (
                f"- {row['feature']}: ks_stat={row['ks_stat']:.3f}, "
                f"p_value={row['p_value']:.5f}, "
                f"reference_mean={row['reference_mean']:.2f}, "
                f"incoming_mean={row['incoming_mean']:.2f}"
            )
        )

    if not top_feature_lines:
        top_feature_lines.append("- No features crossed the drift threshold.")

    return f"""
You are helping investigate feature drift for a bank marketing ML system.

Incoming batch source:
{incoming_source_description}

Focus feature:
- {focus_row['feature']}: ks_stat={focus_row['ks_stat']:.3f}, p_value={focus_row['p_value']:.5f}
- reference_mean={focus_row['reference_mean']:.2f}, incoming_mean={focus_row['incoming_mean']:.2f}
- reference_std={focus_row['reference_std']:.2f}, incoming_std={focus_row['incoming_std']:.2f}

Top drifted features:
{chr(10).join(top_feature_lines)}

Instructions:
- Explain the most likely cause of the drift using only the evidence above.
- Distinguish the primary shifted feature from any secondary correlated features.
- Give exactly 2 practical next actions for an ML team.
- Keep the answer concise and grounded.
""".strip()


def build_display_table(report_df):
    display_df = report_df.copy()
    display_df["status"] = display_df["drift"].map(lambda flagged: "Alert" if flagged else "Stable")
    display_df["ks_stat"] = display_df["ks_stat"].map(lambda value: f"{value:.3f}")
    display_df["p_value"] = display_df["p_value"].map(lambda value: f"{value:.5f}")
    display_df["reference_mean"] = display_df["reference_mean"].map(lambda value: f"{value:.2f}")
    display_df["incoming_mean"] = display_df["incoming_mean"].map(lambda value: f"{value:.2f}")
    display_df["mean_delta"] = display_df["mean_delta"].map(lambda value: f"{value:.2f}")
    display_df["mean_shift_pct"] = display_df["mean_shift_pct"].map(
        lambda value: "n/a" if pd.isna(value) else f"{value:.1f}%"
    )

    return display_df[
        [
            "feature",
            "status",
            "severity",
            "ks_stat",
            "p_value",
            "reference_mean",
            "incoming_mean",
            "mean_delta",
            "mean_shift_pct",
        ]
    ]


def render_hero_banner(incoming_label, p_threshold, drifted_features, monitored_columns):
    tone_class = "hero-alert" if drifted_features else "hero-stable"
    summary_text = (
        f"{len(drifted_features)} of {len(monitored_columns)} monitored numeric features are currently flagged."
    )
    chips = [
        f"Source: {incoming_label}",
        f"Threshold: p < {p_threshold:.3f}",
        "Workflow: drift detection + feature analysis + RCA",
    ]
    chip_html = "".join(f"<span class='chip'>{html.escape(chip)}</span>" for chip in chips)

    st.markdown(
        f"""
        <div class="hero-card {tone_class}">
            <div class="eyebrow">MLOps</div>
            <h1 class="hero-title">Driftium Monitoring Console</h1>
            <p class="hero-copy">
                Detect distribution shifts in an incoming batch, inspect how individual features moved,
                and generate a concise root-cause summary for incident-style debugging.
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
            f"(KS {top_row['ks_stat']:.3f}, p-value {top_row['p_value']:.5f})."
        )
        css_class = "status-panel status-alert"
    else:
        title = "Current batch is stable"
        body = (
            f"No monitored numeric feature crossed the drift threshold. Highest observed KS statistic "
            f"was {top_row['ks_stat']:.3f} for {top_row['feature']}."
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
numeric_columns = get_numeric_feature_columns(reference_df)

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

monitored_columns = [column for column in numeric_columns if column in incoming_df.columns]
missing_columns = [column for column in numeric_columns if column not in incoming_df.columns]

if not monitored_columns:
    st.error("No compatible numeric columns were found in the incoming batch.")
    st.stop()

drift_df = build_drift_report(reference_df, incoming_df, monitored_columns, p_threshold)
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

render_hero_banner(incoming_label, p_threshold, drifted_features, monitored_columns)

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
    metric_columns[2].metric("Drifted features", f"{len(drifted_features)}")
    metric_columns[3].metric("Drift rate", f"{drift_rate:.0%}")
    metric_columns[4].metric("Highest KS stat", f"{drift_df['ks_stat'].max():.3f}")

    if missing_columns:
        st.info(
            "Incoming batch is missing these numeric reference columns: "
            + ", ".join(missing_columns)
        )

    with st.expander("Why this dashboard is portfolio-ready"):
        st.write(
            "It combines configurable monitoring, batch-vs-reference comparison, feature-level diagnostics, "
            "and a grounded RCA step in one flow. That makes it easier to explain as an end-to-end MLOps project."
        )

    st.subheader("Top drift signals")
    top_chart_df = drift_df.head(10).set_index("feature")[["ks_stat"]]
    st.bar_chart(top_chart_df, use_container_width=True)

    st.subheader("Monitoring snapshot")
    st.dataframe(
        display_df,
        hide_index=True,
        use_container_width=True,
    )

with feature_tab:
    selected_feature = st.selectbox(
        "Inspect a numeric feature",
        options=monitored_columns,
        index=monitored_columns.index(focused_feature_default),
    )

    selected_row = drift_df.loc[drift_df["feature"] == selected_feature].iloc[0]
    selected_summary = summarize_feature(reference_df, incoming_df, selected_feature)

    feature_metrics = st.columns(4)
    feature_metrics[0].metric("Reference mean", f"{selected_summary['reference_mean']:.2f}")
    feature_metrics[1].metric(
        "Incoming mean",
        f"{selected_summary['incoming_mean']:.2f}",
        delta=f"{selected_row['mean_delta']:.2f}",
    )
    feature_metrics[2].metric("Severity", selected_row["severity"])
    feature_metrics[3].metric("KS stat", f"{selected_row['ks_stat']:.3f}")

    chart_column, insight_column = st.columns([1.7, 1.0])

    with chart_column:
        histogram_df = build_histogram(reference_df[selected_feature], incoming_df[selected_feature])
        st.subheader(f"Distribution comparison for {selected_feature}")
        st.bar_chart(histogram_df, use_container_width=True)

    with insight_column:
        drift_status = "Alert" if selected_row["drift"] else "Stable"
        shift_pct = (
            "n/a" if pd.isna(selected_row["mean_shift_pct"]) else f"{selected_row['mean_shift_pct']:.1f}%"
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
            <p><strong>Status:</strong> {"Alert" if rca_row["drift"] else "Stable"}</p>
            <p><strong>Severity:</strong> {html.escape(rca_row["severity"])}</p>
            <p><strong>KS stat / p-value:</strong> {rca_row["ks_stat"]:.3f} / {rca_row["p_value"]:.5f}</p>
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
