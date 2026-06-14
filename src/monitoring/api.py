from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.llm.llm_explainer import UNAVAILABLE_MESSAGE, generate_explanation_result
from src.monitoring.service import (
    DEFAULT_REFERENCE_DATA_PATH,
    build_categorical_distribution,
    build_histogram,
    build_monitoring_result,
    build_rca_prompt,
    describe_shift,
    load_reference_data,
    read_incoming_csv,
    simulate_incoming_batch,
    summarize_categorical_feature,
    summarize_numeric_feature,
)


app = FastAPI(title="Driftium Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RCARequest(BaseModel):
    feature: str = Field(min_length=1)
    drift_rows: list[dict[str, Any]] = Field(min_length=1)
    incoming_source_description: str = Field(min_length=1)


_REFERENCE_DF: pd.DataFrame | None = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_reference_df() -> pd.DataFrame:
    global _REFERENCE_DF

    if _REFERENCE_DF is None:
        _REFERENCE_DF = load_reference_data(DEFAULT_REFERENCE_DATA_PATH)

    return _REFERENCE_DF


def _clean_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        if pd.isna(value) or np.isinf(value):
            return None
        return float(value)
    if pd.isna(value):
        return None
    return value


def _records(df: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {str(column): _clean_value(value) for column, value in row.items()}
        for row in df.to_dict(orient="records")
    ]


def _chart_records(df: pd.DataFrame, label_key: str) -> list[dict[str, Any]]:
    records = []

    for label, row in df.iterrows():
        records.append(
            {
                label_key: str(label),
                "reference": _clean_value(row.get("Reference")),
                "incoming": _clean_value(row.get("Incoming")),
            }
        )

    return records


def _row_for_feature(drift_df: pd.DataFrame, feature_name: str) -> pd.Series:
    matching_rows = drift_df.loc[drift_df["feature"] == feature_name]

    if matching_rows.empty:
        raise HTTPException(status_code=404, detail=f"Feature '{feature_name}' was not found.")

    return matching_rows.iloc[0]


def _build_feature_details(
    reference_df: pd.DataFrame,
    incoming_df: pd.DataFrame,
    drift_df: pd.DataFrame,
    monitored_columns: list[str],
) -> dict[str, dict[str, Any]]:
    details = {}

    for feature_name in monitored_columns:
        row = _row_for_feature(drift_df, feature_name)
        base = {
            "feature": feature_name,
            "type": _clean_value(row["feature_type"]),
            "status": "Alert" if row["drift"] else "Stable",
            "severity": _clean_value(row["severity"]),
            "test": _clean_value(row["test"]),
            "drift_score": _clean_value(row["drift_score"]),
            "p_value": _clean_value(row["p_value"]),
            "shift_summary": describe_shift(row),
        }

        if row["feature_type"] == "numeric":
            summary = summarize_numeric_feature(reference_df, incoming_df, feature_name)
            histogram_df = build_histogram(reference_df[feature_name], incoming_df[feature_name])
            details[feature_name] = {
                **base,
                "chart_type": "histogram",
                "chart_label": "bucket",
                "chart": _chart_records(histogram_df, "bucket"),
                "metrics": {
                    "reference_mean": _clean_value(summary["reference_mean"]),
                    "incoming_mean": _clean_value(summary["incoming_mean"]),
                    "reference_std": _clean_value(summary["reference_std"]),
                    "incoming_std": _clean_value(summary["incoming_std"]),
                    "reference_median": _clean_value(summary["reference_median"]),
                    "incoming_median": _clean_value(summary["incoming_median"]),
                    "mean_delta": _clean_value(row["mean_delta"]),
                    "mean_shift_pct": _clean_value(row["mean_shift_pct"]),
                },
            }
        else:
            summary = summarize_categorical_feature(reference_df, incoming_df, feature_name)
            category_df = build_categorical_distribution(
                reference_df[feature_name],
                incoming_df[feature_name],
            )
            details[feature_name] = {
                **base,
                "chart_type": "categorical",
                "chart_label": "category",
                "chart": _chart_records(category_df, "category"),
                "metrics": {
                    "reference_top": _clean_value(summary["reference_top"]),
                    "incoming_top": _clean_value(summary["incoming_top"]),
                    "reference_top_share": _clean_value(summary["reference_top_share"]),
                    "incoming_top_share": _clean_value(summary["incoming_top_share"]),
                    "reference_unique": _clean_value(summary["reference_unique"]),
                    "incoming_unique": _clean_value(summary["incoming_unique"]),
                    "most_shifted_value": _clean_value(row["most_shifted_value"]),
                    "share_delta": _clean_value(row["share_delta"]),
                },
            }

    return details


def _build_monitoring_payload(
    incoming_df: pd.DataFrame,
    *,
    incoming_label: str,
    incoming_source_description: str,
    p_threshold: float,
) -> dict[str, Any]:
    reference_df = _load_reference_df()
    result = build_monitoring_result(reference_df, incoming_df, p_threshold)
    drift_df = result.drift_df
    top_row = drift_df.iloc[0] if not drift_df.empty else None

    return {
        "generated_at": _utc_now(),
        "source": {
            "label": incoming_label,
            "description": incoming_source_description,
        },
        "threshold": p_threshold,
        "summary": asdict(result.summary),
        "numeric_columns": result.numeric_columns,
        "categorical_columns": result.categorical_columns,
        "monitored_columns": result.monitored_columns,
        "missing_columns": result.missing_columns,
        "drifted_features": result.drifted_features,
        "top_signal": None
        if top_row is None
        else {
            "feature": _clean_value(top_row["feature"]),
            "severity": _clean_value(top_row["severity"]),
            "test": _clean_value(top_row["test"]),
            "drift_score": _clean_value(top_row["drift_score"]),
            "p_value": _clean_value(top_row["p_value"]),
            "status": "Alert" if top_row["drift"] else "Stable",
        },
        "display_rows": _records(result.display_df),
        "drift_rows": _records(result.drift_df),
        "feature_details": _build_feature_details(
            reference_df,
            incoming_df,
            drift_df,
            result.monitored_columns,
        ),
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "generated_at": _utc_now()}


@app.get("/api/monitoring/simulated")
def get_simulated_monitoring(
    age_threshold: int = Query(35, ge=20, le=60),
    p_threshold: float = Query(0.05, gt=0, le=1),
) -> dict[str, Any]:
    reference_df = _load_reference_df()
    incoming_df = simulate_incoming_batch(reference_df, age_threshold)

    try:
        return _build_monitoring_payload(
            incoming_df,
            incoming_label=f"Simulated batch: age < {age_threshold}",
            incoming_source_description=(
                f"Simulated batch created by filtering the dataset to rows where age < "
                f"{age_threshold}."
            ),
            p_threshold=p_threshold,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/monitoring/upload")
async def upload_monitoring_batch(
    request: Request,
    p_threshold: float = Query(0.05, gt=0, le=1),
    x_filename: str | None = Header(default=None),
) -> dict[str, Any]:
    content = await request.body()

    try:
        incoming_df = read_incoming_csv(content)
        return _build_monitoring_payload(
            incoming_df,
            incoming_label=x_filename or "Uploaded batch",
            incoming_source_description=(
                "User-uploaded incoming batch. No extra business context was provided, "
                "so avoid unsupported claims."
            ),
            p_threshold=p_threshold,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/rca")
def generate_rca(request: RCARequest) -> dict[str, Any]:
    drift_df = pd.DataFrame(request.drift_rows)

    if request.feature not in set(drift_df.get("feature", [])):
        raise HTTPException(status_code=404, detail=f"Feature '{request.feature}' was not found.")

    prompt = build_rca_prompt(
        drift_df,
        request.feature,
        request.incoming_source_description,
    )
    result = generate_explanation_result(prompt)

    return {
        "available": result.available,
        "content": result.content,
        "error": result.error,
        "model": result.model,
        "message": None if result.available else UNAVAILABLE_MESSAGE,
    }


from src.llm_monitoring.api import app as llm_monitoring_app

app.mount("/", llm_monitoring_app)

