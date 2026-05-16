from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from pandas.api.types import is_bool_dtype, is_numeric_dtype

from src.monitoring.drift_detection import detect_drift


DEFAULT_REFERENCE_DATA_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "raw" / "bank-additional-full.csv"
)


@dataclass(frozen=True)
class MonitoringSummary:
    reference_rows: int
    incoming_rows: int
    monitored_feature_count: int
    numeric_feature_count: int
    categorical_feature_count: int
    drifted_feature_count: int
    drift_rate: float


@dataclass(frozen=True)
class MonitoringResult:
    drift_df: pd.DataFrame
    display_df: pd.DataFrame
    numeric_columns: list[str]
    categorical_columns: list[str]
    monitored_columns: list[str]
    missing_columns: list[str]
    drifted_features: list[str]
    summary: MonitoringSummary


def load_reference_data(data_path: str | Path = DEFAULT_REFERENCE_DATA_PATH) -> pd.DataFrame:
    return pd.read_csv(data_path, sep=";")


def read_incoming_csv(content: bytes) -> pd.DataFrame:
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


def read_uploaded_batch(uploaded_file) -> pd.DataFrame:
    return read_incoming_csv(uploaded_file.getvalue())


def get_monitoring_feature_columns(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    feature_df = df.drop(columns=["y"], errors="ignore")
    numeric_columns = []
    categorical_columns = []

    for column in feature_df.columns:
        series = feature_df[column]
        if is_bool_dtype(series) or not is_numeric_dtype(series):
            categorical_columns.append(column)
        else:
            numeric_columns.append(column)

    return numeric_columns, categorical_columns


def simulate_incoming_batch(reference_df: pd.DataFrame, age_threshold: int) -> pd.DataFrame:
    if "age" not in reference_df.columns:
        raise KeyError("Column 'age' was not found in the reference dataframe.")

    return reference_df[reference_df["age"] < age_threshold].copy()


def summarize_numeric_feature(
    reference_df: pd.DataFrame,
    incoming_df: pd.DataFrame,
    feature_name: str,
) -> dict[str, float]:
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


def summarize_categorical_feature(
    reference_df: pd.DataFrame,
    incoming_df: pd.DataFrame,
    feature_name: str,
) -> dict[str, object]:
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


def safe_percent_change(reference_value: float, incoming_value: float) -> float:
    if pd.isna(reference_value) or pd.isna(incoming_value) or reference_value == 0:
        return np.nan

    return ((incoming_value - reference_value) / abs(reference_value)) * 100


def format_percent(value: float) -> str:
    return "n/a" if pd.isna(value) else f"{value * 100:.1f}%"


def format_score(value: float) -> str:
    return "n/a" if pd.isna(value) else f"{value:.3f}"


def classify_severity(row: pd.Series) -> str:
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


def describe_shift(row: pd.Series) -> str:
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

    if pd.isna(row["mean_delta"]):
        return f"Mean shift for {row['feature']} is unavailable because one batch has no numeric values."

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


def _validate_monitoring_inputs(
    reference_df: pd.DataFrame,
    incoming_df: pd.DataFrame,
    p_threshold: float,
) -> None:
    if reference_df.empty:
        raise ValueError("The reference dataset is empty.")
    if incoming_df.empty:
        raise ValueError("The incoming batch is empty. Adjust the controls or upload a different CSV.")
    if not 0 < p_threshold <= 1:
        raise ValueError("The drift p-value threshold must be greater than 0 and at most 1.")


def build_drift_report(
    reference_df: pd.DataFrame,
    incoming_df: pd.DataFrame,
    numeric_columns: Iterable[str],
    categorical_columns: Iterable[str],
    p_threshold: float,
) -> pd.DataFrame:
    numeric_columns = list(numeric_columns)
    categorical_columns = list(categorical_columns)
    monitored_columns = numeric_columns + categorical_columns

    drift_df = detect_drift(
        reference_df,
        incoming_df,
        monitored_columns,
        p_threshold=p_threshold,
        categorical_columns=categorical_columns,
    ).copy()

    if drift_df.empty:
        return drift_df

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


def build_display_table(report_df: pd.DataFrame) -> pd.DataFrame:
    rows = []

    for _, row in report_df.iterrows():
        status = "Alert" if row["drift"] else "Stable"

        if row["feature_type"] == "categorical":
            shifted_value = row["most_shifted_value"] or "n/a"
            reference_summary = f"{shifted_value}: {format_percent(row['reference_share'])}"
            incoming_summary = f"{shifted_value}: {format_percent(row['incoming_share'])}"
            shift = f"{row['share_delta'] * 100:+.1f} pp" if not pd.isna(row["share_delta"]) else "n/a"
        else:
            reference_summary = (
                "mean n/a" if pd.isna(row["reference_mean"]) else f"mean {row['reference_mean']:.2f}"
            )
            incoming_summary = (
                "mean n/a" if pd.isna(row["incoming_mean"]) else f"mean {row['incoming_mean']:.2f}"
            )
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


def build_monitoring_result(
    reference_df: pd.DataFrame,
    incoming_df: pd.DataFrame,
    p_threshold: float,
) -> MonitoringResult:
    _validate_monitoring_inputs(reference_df, incoming_df, p_threshold)

    reference_numeric_columns, reference_categorical_columns = get_monitoring_feature_columns(
        reference_df
    )
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
        raise ValueError("No compatible feature columns were found in the incoming batch.")

    drift_df = build_drift_report(
        reference_df,
        incoming_df,
        numeric_columns,
        categorical_columns,
        p_threshold,
    )
    drifted_features = drift_df.loc[drift_df["drift"], "feature"].tolist()
    display_df = build_display_table(drift_df)
    drift_rate = len(drifted_features) / len(monitored_columns)

    summary = MonitoringSummary(
        reference_rows=len(reference_df),
        incoming_rows=len(incoming_df),
        monitored_feature_count=len(monitored_columns),
        numeric_feature_count=len(numeric_columns),
        categorical_feature_count=len(categorical_columns),
        drifted_feature_count=len(drifted_features),
        drift_rate=drift_rate,
    )

    return MonitoringResult(
        drift_df=drift_df,
        display_df=display_df,
        numeric_columns=numeric_columns,
        categorical_columns=categorical_columns,
        monitored_columns=monitored_columns,
        missing_columns=missing_columns,
        drifted_features=drifted_features,
        summary=summary,
    )


def build_histogram(
    reference_series: pd.Series,
    incoming_series: pd.Series,
    bins: int = 18,
) -> pd.DataFrame:
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

    labels = [f"{edges[index]:.1f} to {edges[index + 1]:.1f}" for index in range(len(edges) - 1)]

    return pd.DataFrame(
        {
            "Reference": reference_counts,
            "Incoming": incoming_counts,
        },
        index=labels,
    )


def build_categorical_distribution(
    reference_series: pd.Series,
    incoming_series: pd.Series,
    max_categories: int = 10,
) -> pd.DataFrame:
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


def format_feature_evidence(row: pd.Series) -> str:
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


def build_rca_prompt(
    drift_df: pd.DataFrame,
    focus_feature: str,
    incoming_source_description: str,
) -> str:
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
