import pandas as pd

from src.monitoring.drift_detection import detect_drift


def test_detects_numeric_distribution_drift():
    reference_df = pd.DataFrame({"age": list(range(100))})
    incoming_df = pd.DataFrame({"age": list(range(100, 200))})

    report = detect_drift(reference_df, incoming_df, ["age"])
    row = report.iloc[0]

    assert row["feature_type"] == "numeric"
    assert row["test"] == "ks_2samp"
    assert bool(row["drift"])
    assert row["ks_stat"] > 0.9
    assert row["p_value"] < 0.05


def test_marks_matching_numeric_distribution_as_stable():
    reference_df = pd.DataFrame({"duration": [1, 2, 3, 4, 5] * 20})
    incoming_df = pd.DataFrame({"duration": [1, 2, 3, 4, 5] * 20})

    report = detect_drift(reference_df, incoming_df, ["duration"])
    row = report.iloc[0]

    assert row["feature_type"] == "numeric"
    assert not bool(row["drift"])
    assert row["ks_stat"] == 0


def test_detects_categorical_mix_drift():
    reference_df = pd.DataFrame({"job": ["admin"] * 80 + ["services"] * 20})
    incoming_df = pd.DataFrame({"job": ["admin"] * 20 + ["services"] * 80})

    report = detect_drift(reference_df, incoming_df, ["job"], categorical_columns=["job"])
    row = report.iloc[0]

    assert row["feature_type"] == "categorical"
    assert row["test"] == "chi2_contingency"
    assert bool(row["drift"])
    assert row["cramer_v"] > 0.5
    assert round(abs(row["share_delta"]), 3) == 0.6


def test_infers_object_columns_as_categorical():
    reference_df = pd.DataFrame({"marital": ["single", "married", "single", "single"]})
    incoming_df = pd.DataFrame({"marital": ["married", "married", "married", "single"]})

    report = detect_drift(reference_df, incoming_df, ["marital"])
    row = report.iloc[0]

    assert row["feature_type"] == "categorical"
    assert row["cramer_v"] >= 0


def test_empty_numeric_incoming_batch_returns_stable_row():
    reference_df = pd.DataFrame({"age": [20, 30, 40]})
    incoming_df = pd.DataFrame({"age": []})

    report = detect_drift(reference_df, incoming_df, ["age"])
    row = report.iloc[0]

    assert not bool(row["drift"])
    assert row["reference_count"] == 3
    assert row["incoming_count"] == 0
