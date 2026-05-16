import pandas as pd
import pytest

from src.monitoring.drift_detection import detect_drift
from src.monitoring.service import (
    build_monitoring_result,
    load_reference_data,
    simulate_incoming_batch,
)


def test_builds_monitoring_result_from_bank_dataset():
    reference_df = load_reference_data()
    incoming_df = simulate_incoming_batch(reference_df, age_threshold=35)

    result = build_monitoring_result(reference_df, incoming_df, p_threshold=0.05)

    assert "age" in result.monitored_columns
    assert "age" in result.drifted_features
    assert result.summary.reference_rows == len(reference_df)
    assert result.summary.incoming_rows == len(incoming_df)
    assert result.summary.monitored_feature_count == len(result.monitored_columns)
    assert len(result.display_df) == len(result.drift_df)


def test_missing_incoming_columns_still_builds_compatible_report():
    reference_df = load_reference_data()
    incoming_df = simulate_incoming_batch(reference_df, age_threshold=35)[["age", "job"]]

    result = build_monitoring_result(reference_df, incoming_df, p_threshold=0.05)

    assert result.monitored_columns == ["age", "job"]
    assert "duration" in result.missing_columns
    assert len(result.drift_df) == 2
    assert set(result.display_df["feature"]) == {"age", "job"}


def test_empty_incoming_batch_returns_controlled_error():
    reference_df = pd.DataFrame({"age": [20, 30, 40], "job": ["admin", "services", "admin"]})
    incoming_df = reference_df.iloc[0:0]

    with pytest.raises(ValueError, match="incoming batch is empty"):
        build_monitoring_result(reference_df, incoming_df, p_threshold=0.05)


def test_categorical_single_category_is_stable():
    reference_df = pd.DataFrame({"segment": ["admin", "admin", "admin"]})
    incoming_df = pd.DataFrame({"segment": ["admin", "admin"]})

    report = detect_drift(reference_df, incoming_df, "segment")
    row = report.iloc[0]

    assert row["feature_type"] == "categorical"
    assert row["p_value"] == 1.0
    assert row["cramer_v"] == 0.0
    assert not bool(row["drift"])


def test_categorical_all_missing_incoming_values_do_not_crash():
    reference_df = pd.DataFrame({"segment": ["admin", "services", "admin"]})
    incoming_df = pd.DataFrame({"segment": [None, None, None]})

    report = detect_drift(reference_df, incoming_df, ["segment"])
    row = report.iloc[0]

    assert row["feature_type"] == "categorical"
    assert pd.notna(row["p_value"])
    assert row["incoming_count"] == 0
    assert row["most_shifted_value"] == "__missing__"


def test_numeric_drift_handles_mixed_type_incoming_values():
    reference_df = pd.DataFrame({"age": [20, 30, 40, 50]})
    incoming_df = pd.DataFrame({"age": ["25", "35", "not-a-number"]})

    report = detect_drift(reference_df, incoming_df, ["age"])
    row = report.iloc[0]

    assert row["feature_type"] == "numeric"
    assert row["incoming_count"] == 2
    assert pd.notna(row["p_value"])
