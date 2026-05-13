from __future__ import annotations

from math import sqrt
from typing import Iterable

import numpy as np
import pandas as pd
from pandas.api.types import is_bool_dtype, is_numeric_dtype
from scipy.stats import chi2_contingency, ks_2samp


MISSING_VALUE_LABEL = "__missing__"


def _as_feature_list(columns: Iterable[str]) -> list[str]:
    return list(columns)


def _is_categorical(series: pd.Series) -> bool:
    return is_bool_dtype(series) or not is_numeric_dtype(series)


def _clean_numeric_pair(reference: pd.Series, incoming: pd.Series) -> tuple[pd.Series, pd.Series]:
    return (
        pd.to_numeric(reference, errors="coerce").dropna(),
        pd.to_numeric(incoming, errors="coerce").dropna(),
    )


def _categorical_counts(reference: pd.Series, incoming: pd.Series) -> pd.DataFrame:
    reference_values = reference.astype("object").where(reference.notna(), MISSING_VALUE_LABEL)
    incoming_values = incoming.astype("object").where(incoming.notna(), MISSING_VALUE_LABEL)

    categories = sorted(
        set(reference_values.unique()).union(set(incoming_values.unique())),
        key=lambda value: str(value),
    )

    return pd.DataFrame(
        {
            "reference": reference_values.value_counts().reindex(categories, fill_value=0),
            "incoming": incoming_values.value_counts().reindex(categories, fill_value=0),
        }
    )


def _most_shifted_category(counts: pd.DataFrame) -> tuple[str | None, float, float, float]:
    reference_total = counts["reference"].sum()
    incoming_total = counts["incoming"].sum()

    if reference_total == 0 or incoming_total == 0:
        return None, np.nan, np.nan, np.nan

    reference_share = counts["reference"] / reference_total
    incoming_share = counts["incoming"] / incoming_total
    share_delta = incoming_share - reference_share
    category = share_delta.abs().idxmax()

    return (
        str(category),
        float(reference_share.loc[category]),
        float(incoming_share.loc[category]),
        float(share_delta.loc[category]),
    )


def _cramers_v(chi2_statistic: float, table: pd.DataFrame) -> float:
    total_count = table.to_numpy().sum()
    min_dimension = min(table.shape) - 1

    if total_count == 0 or min_dimension <= 0:
        return 0.0

    return sqrt(chi2_statistic / (total_count * min_dimension))


def _numeric_drift_row(
    feature: str,
    reference: pd.Series,
    incoming: pd.Series,
    p_threshold: float,
) -> dict[str, object]:
    reference_clean, incoming_clean = _clean_numeric_pair(reference, incoming)

    if reference_clean.empty or incoming_clean.empty:
        statistic = 0.0
        p_value = 1.0
    else:
        statistic, p_value = ks_2samp(reference_clean, incoming_clean)

    statistic = float(statistic)
    p_value = float(p_value)

    return {
        "feature": feature,
        "feature_type": "numeric",
        "test": "ks_2samp",
        "statistic": statistic,
        "drift_score": statistic,
        "ks_stat": statistic,
        "cramer_v": np.nan,
        "p_value": p_value,
        "p_threshold": p_threshold,
        "drift": p_value < p_threshold,
        "reference_count": int(reference_clean.size),
        "incoming_count": int(incoming_clean.size),
        "most_shifted_value": None,
        "reference_share": np.nan,
        "incoming_share": np.nan,
        "share_delta": np.nan,
    }


def _categorical_drift_row(
    feature: str,
    reference: pd.Series,
    incoming: pd.Series,
    p_threshold: float,
) -> dict[str, object]:
    counts = _categorical_counts(reference, incoming)
    non_empty_counts = counts.loc[counts.sum(axis=1) > 0]

    if len(non_empty_counts) < 2:
        statistic = 0.0
        p_value = 1.0
        cramer_v = 0.0
    else:
        statistic, p_value, _, _ = chi2_contingency(non_empty_counts.T)
        statistic = float(statistic)
        p_value = float(p_value)
        cramer_v = float(_cramers_v(statistic, non_empty_counts.T))

    shifted_value, reference_share, incoming_share, share_delta = _most_shifted_category(
        non_empty_counts
    )

    return {
        "feature": feature,
        "feature_type": "categorical",
        "test": "chi2_contingency",
        "statistic": statistic,
        "drift_score": cramer_v,
        "ks_stat": np.nan,
        "cramer_v": cramer_v,
        "p_value": p_value,
        "p_threshold": p_threshold,
        "drift": p_value < p_threshold,
        "reference_count": int(reference.notna().sum()),
        "incoming_count": int(incoming.notna().sum()),
        "most_shifted_value": shifted_value,
        "reference_share": reference_share,
        "incoming_share": incoming_share,
        "share_delta": share_delta,
    }


def detect_drift(
    train_df: pd.DataFrame,
    prod_df: pd.DataFrame,
    columns: Iterable[str],
    p_threshold: float = 0.05,
    categorical_columns: Iterable[str] | None = None,
) -> pd.DataFrame:
    """Detect feature drift between a reference dataset and an incoming batch.

    Numeric features use the two-sample Kolmogorov-Smirnov test. Categorical
    features use a chi-square contingency test and Cramer's V as the effect
    size. The returned dataframe keeps the original `ks_stat` column for
    compatibility with the CLI workflow.
    """

    categorical_set = set(categorical_columns or [])
    results = []

    for column in _as_feature_list(columns):
        if column not in train_df.columns:
            raise KeyError(f"Column '{column}' was not found in the reference dataframe.")
        if column not in prod_df.columns:
            raise KeyError(f"Column '{column}' was not found in the incoming dataframe.")

        if column in categorical_set or _is_categorical(train_df[column]):
            results.append(
                _categorical_drift_row(column, train_df[column], prod_df[column], p_threshold)
            )
        else:
            results.append(_numeric_drift_row(column, train_df[column], prod_df[column], p_threshold))

    return pd.DataFrame(results)
