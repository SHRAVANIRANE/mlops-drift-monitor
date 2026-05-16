import html
from datetime import datetime

import pandas as pd
import streamlit as st

from src.llm.llm_explainer import UNAVAILABLE_MESSAGE, generate_explanation_result
from src.monitoring.service import (
    DEFAULT_REFERENCE_DATA_PATH,
    build_categorical_distribution,
    build_histogram,
    build_monitoring_result,
    build_rca_prompt,
    describe_shift,
    format_percent,
    load_reference_data,
    read_uploaded_batch,
    simulate_incoming_batch,
    summarize_categorical_feature,
    summarize_numeric_feature,
)


st.set_page_config(page_title="Driftium", layout="wide")
st.markdown(
    """
    <style>
    :root {
        --bg: #111315;
        --panel: #1A1E22;
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

    div[data-testid="stMetric"],
    .hero-panel,
    .status-panel,
    .insight-card {
        background: rgba(26, 30, 34, 0.98);
        border: 1px solid var(--border);
        border-radius: 8px;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
    }

    div[data-testid="stMetric"] {
        padding: 0.8rem 1rem;
    }

    div[data-testid="stMetricLabel"] {
        color: var(--muted);
        font-weight: 600;
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

    .hero-panel {
        padding: 1.4rem 1.5rem;
        margin-bottom: 1rem;
        border-left: 4px solid var(--success);
    }

    .hero-alert {
        border-left-color: var(--error);
    }

    .eyebrow {
        color: var(--accent);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
    }

    .hero-title {
        color: var(--text);
        font-size: 2.2rem;
        font-weight: 700;
        line-height: 1.1;
        margin: 0 0 0.4rem 0;
    }

    .hero-copy {
        color: #D1D9E0;
        font-size: 1rem;
        margin: 0 0 1rem 0;
        max-width: 860px;
    }

    .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .chip {
        align-items: center;
        background: rgba(167, 176, 186, 0.10);
        border: 1px solid rgba(167, 176, 186, 0.20);
        border-radius: 8px;
        color: #D7DEE6;
        display: inline-flex;
        font-size: 0.9rem;
        font-weight: 500;
        padding: 0.35rem 0.75rem;
    }

    .status-panel {
        margin-bottom: 1rem;
        padding: 1rem 1.1rem;
    }

    .status-alert {
        background: rgba(242, 95, 92, 0.10);
        border-color: rgba(242, 95, 92, 0.30);
    }

    .status-stable {
        background: rgba(47, 191, 113, 0.10);
        border-color: rgba(47, 191, 113, 0.28);
    }

    .status-panel h3,
    .insight-card h4 {
        margin: 0 0 0.4rem 0;
    }

    .status-panel p,
    .insight-card p,
    .insight-card li {
        color: #D1D9E0;
    }

    .insight-card {
        padding: 1rem 1.1rem;
    }

    [data-testid="stDataFrame"],
    [data-testid="stExpander"] details {
        background: rgba(26, 30, 34, 0.98);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
    }

    [data-testid="stInfo"], [data-testid="stSuccess"],
    [data-testid="stWarning"], [data-testid="stError"] {
        border-radius: 8px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def load_cached_reference_data():
    return load_reference_data(DEFAULT_REFERENCE_DATA_PATH)


def render_hero_banner(monitoring_result, incoming_label, p_threshold):
    summary = monitoring_result.summary
    tone_class = "hero-alert" if monitoring_result.drifted_features else ""
    summary_text = (
        f"{summary.drifted_feature_count} of {summary.monitored_feature_count} "
        "monitored features are currently flagged."
    )
    chips = [
        f"Source: {incoming_label}",
        f"Threshold: p < {p_threshold:.3f}",
        (
            "Features: "
            f"{summary.numeric_feature_count} numeric, "
            f"{summary.categorical_feature_count} categorical"
        ),
    ]
    chip_html = "".join(f"<span class='chip'>{html.escape(chip)}</span>" for chip in chips)

    st.markdown(
        f"""
        <div class="hero-panel {tone_class}">
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


def render_insight_card(rows):
    body = "".join(
        f"<p><strong>{html.escape(label)}:</strong> {html.escape(str(value))}</p>"
        for label, value in rows
    )
    st.markdown(
        f"""
        <div class="insight-card">
            <h4>Feature health summary</h4>
            {body}
        </div>
        """,
        unsafe_allow_html=True,
    )


reference_df = load_cached_reference_data()

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

try:
    monitoring_result = build_monitoring_result(reference_df, incoming_df, p_threshold)
except ValueError as error:
    if "empty" in str(error).lower():
        st.warning(str(error))
    else:
        st.error(str(error))
    st.stop()

drift_df = monitoring_result.drift_df
display_df = monitoring_result.display_df
numeric_columns = monitoring_result.numeric_columns
categorical_columns = monitoring_result.categorical_columns
monitored_columns = monitoring_result.monitored_columns
missing_columns = monitoring_result.missing_columns
drifted_features = monitoring_result.drifted_features
focused_feature_default = drifted_features[0] if drifted_features else monitored_columns[0]
report_context_key = (
    incoming_mode,
    incoming_source_key,
    round(p_threshold, 3),
    tuple(drifted_features),
)

if st.session_state.get("report_context_key") != report_context_key:
    st.session_state.pop("rca_result", None)
    st.session_state.pop("rca_feature_name", None)
    st.session_state["report_context_key"] = report_context_key

render_hero_banner(monitoring_result, incoming_label, p_threshold)

overview_tab, feature_tab, rca_tab, reports_tab = st.tabs(
    ["Overview", "Feature Analysis", "RCA", "Reports"]
)

with overview_tab:
    render_status_panel(drift_df, drifted_features)

    summary = monitoring_result.summary
    metric_columns = st.columns(5)
    metric_columns[0].metric("Reference rows", f"{summary.reference_rows:,}")
    metric_columns[1].metric(
        "Incoming rows",
        f"{summary.incoming_rows:,}",
        delta=f"{summary.incoming_rows - summary.reference_rows:,} vs ref",
    )
    metric_columns[2].metric("Monitored features", f"{summary.monitored_feature_count}")
    metric_columns[3].metric("Drifted features", f"{summary.drifted_feature_count}")
    metric_columns[4].metric("Drift rate", f"{summary.drift_rate:.0%}")

    if missing_columns:
        st.info("Incoming batch is missing these reference columns: " + ", ".join(missing_columns))

    st.subheader("Top drift signals")
    top_chart_df = drift_df.head(10).set_index("feature")[["drift_score"]]
    st.bar_chart(top_chart_df, width="stretch")

    st.subheader("Monitoring snapshot")
    st.dataframe(display_df, hide_index=True, width="stretch")

with feature_tab:
    selected_feature = st.selectbox(
        "Inspect a feature",
        options=monitored_columns,
        index=monitored_columns.index(focused_feature_default),
    )
    selected_row = drift_df.loc[drift_df["feature"] == selected_feature].iloc[0]

    if selected_row["feature_type"] == "numeric":
        selected_summary = summarize_numeric_feature(reference_df, incoming_df, selected_feature)
        mean_delta = "n/a" if pd.isna(selected_row["mean_delta"]) else f"{selected_row['mean_delta']:.2f}"
        feature_metrics = st.columns(4)
        feature_metrics[0].metric("Reference mean", f"{selected_summary['reference_mean']:.2f}")
        feature_metrics[1].metric(
            "Incoming mean",
            f"{selected_summary['incoming_mean']:.2f}",
            delta=mean_delta,
        )
        feature_metrics[2].metric("Severity", selected_row["severity"])
        feature_metrics[3].metric("KS stat", f"{selected_row['drift_score']:.3f}")

        chart_column, insight_column = st.columns([1.7, 1.0])

        with chart_column:
            histogram_df = build_histogram(reference_df[selected_feature], incoming_df[selected_feature])
            st.subheader(f"Distribution comparison for {selected_feature}")
            st.bar_chart(histogram_df, width="stretch")

        with insight_column:
            drift_status = "Alert" if selected_row["drift"] else "Stable"
            shift_pct = (
                "n/a"
                if pd.isna(selected_row["mean_shift_pct"])
                else f"{selected_row['mean_shift_pct']:.1f}%"
            )
            render_insight_card(
                [
                    ("Status", drift_status),
                    ("Severity", selected_row["severity"]),
                    ("Shift summary", describe_shift(selected_row)),
                    ("Reference median", f"{selected_summary['reference_median']:.2f}"),
                    ("Incoming median", f"{selected_summary['incoming_median']:.2f}"),
                    ("Relative mean shift", shift_pct),
                ]
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
            st.bar_chart(category_df, width="stretch")

        with insight_column:
            drift_status = "Alert" if selected_row["drift"] else "Stable"
            render_insight_card(
                [
                    ("Status", drift_status),
                    ("Severity", selected_row["severity"]),
                    ("Shift summary", describe_shift(selected_row)),
                    ("Reference top share", format_percent(selected_summary["reference_top_share"])),
                    ("Incoming top share", format_percent(selected_summary["incoming_top_share"])),
                    (
                        "Unique values",
                        (
                            f"{selected_summary['reference_unique']} ref / "
                            f"{selected_summary['incoming_unique']} incoming"
                        ),
                    ),
                ]
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

    if st.button("Generate explanation", width="stretch"):
        with st.spinner("Generating RCA summary..."):
            rca_prompt = build_rca_prompt(drift_df, rca_feature, incoming_source_description)
            st.session_state["rca_result"] = generate_explanation_result(rca_prompt)
            st.session_state["rca_feature_name"] = rca_feature

    if "rca_result" in st.session_state:
        explained_feature = st.session_state.get("rca_feature_name", rca_feature)
        rca_result = st.session_state["rca_result"]

        if rca_result.available:
            st.subheader(f"LLM explanation for {explained_feature}")
            st.write(rca_result.content)
        else:
            st.warning(UNAVAILABLE_MESSAGE)
            if rca_result.error:
                st.caption(f"Details: {rca_result.error}")
    else:
        st.info("Generate an explanation to see a concise RCA summary for the selected feature.")

with reports_tab:
    report_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_filename = f"drift_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    st.write(f"Report generated at: {report_timestamp}")

    report_df = drift_df.copy()
    st.dataframe(display_df, hide_index=True, width="stretch")

    st.download_button(
        label="Download drift report CSV",
        data=report_df.to_csv(index=False).encode("utf-8"),
        file_name=report_filename,
        mime="text/csv",
        width="stretch",
    )
