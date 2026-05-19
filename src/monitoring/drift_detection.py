from __future__ import annotations

from math import sqrt
from typing import Iterable

import numpy as np
import pandas as pd
from pandas.api.types import is_bool_dtype, is_numeric_dtype
from scipy.stats import chi2_contingency, ks_2samp

# This constant is used to represent missing values in categorical features.
MISSING_VALUE_LABEL = "__missing__"

# these are the columns that will be included in the drift detection results dataframe.
RESULT_COLUMNS = [
    "feature",
    "feature_type",
    "test",
    "statistic",
    "drift_score",
    "ks_stat",
    "cramer_v",
    "p_value",
    "p_threshold",
    "drift",
    "reference_count",
    "incoming_count",
    "most_shifted_value",
    "reference_share",
    "incoming_share",
    "share_delta",
]

# as_feature_list ensures that the columns argument is always treated as a list of strings, even if a single string is provided.
# because the function accepts both a single string and an iterable of strings, it checks the type of the input and converts it to a list if necessary.
def _as_feature_list(columns: Iterable[str]) -> list[str]:
    if isinstance(columns, str):
        return [columns]

    return list(columns)

# _validate_p_threshold checks that the provided p-value threshold is within the valid range (0, 1]. If the threshold is invalid, it raises a ValueError with an appropriate message.
def _validate_p_threshold(p_threshold: float) -> None:
    if not 0 < p_threshold <= 1:
        raise ValueError("p_threshold must be greater than 0 and at most 1.")

# _is_categorical determines whether a given pandas Series should be treated as categorical. 
# It considers a series to be categorical if it has a boolean data type or if it does not have a numeric data type. 
# This allows the drift detection function to apply the appropriate statistical tests based on the nature of the data.
def _is_categorical(series: pd.Series) -> bool:
    return is_bool_dtype(series) or not is_numeric_dtype(series)


# _clean_numeric_pair converts the input series to numeric types and drops any missing values.
# This is done to ensure that the data is in a suitable format for the statistical tests.
# The function uses pandas' to_numeric method with the errors="coerce" option,
# which converts non-numeric values to NaN, and then drops those NaN values from the resulting series.
def _clean_numeric_pair(reference: pd.Series, incoming: pd.Series) -> tuple[pd.Series, pd.Series]:
    return (
        pd.to_numeric(reference, errors="coerce").dropna(),
        pd.to_numeric(incoming, errors="coerce").dropna(),
    )

# _categorical_counts computes the counts of unique values in the reference and incoming series for categorical features.
# It also handles missing values by replacing them with the MISSING_VALUE_LABEL constant.
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

# _most_shifted_category identifies the category with the largest absolute change in share between the reference and incoming datasets.
# It calculates the share of each category in both datasets and returns the category with the largest absolute difference in shares.
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


# _cramers_v calculates Cramer's V coefficient, which measures the association between two categorical variables.
# It takes the chi-square statistic and the contingency table as inputs and returns the Cramer's V coefficient.
def _cramers_v(chi2_statistic: float, table: pd.DataFrame) -> float:
    total_count = table.to_numpy().sum()
    min_dimension = min(table.shape) - 1

    if total_count == 0 or min_dimension <= 0:
        return 0.0

    return sqrt(chi2_statistic / (total_count * min_dimension))

# _numeric_drift_row computes the drift score and p-value for a numeric feature using the two-sample Kolmogorov-Smirnov test.
# It returns a dictionary containing the drift statistics and metadata for the feature.
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

# _categorical_drift_row computes the drift score and p-value for a categorical feature using a chi-square contingency test.
# It also calculates Cramer's V as the effect size and identifies the most shifted category.
# The function returns a dictionary containing the drift statistics and metadata for the feature.
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

# detect_drift is the main function that detects feature drift between a reference dataset and an incoming batch.
# It iterates over the specified columns and applies the appropriate statistical tests based on whether the feature is numeric or categorical. 
# The function returns a dataframe containing the drift detection results for each feature.
# Numeric features use the two-sample Kolmogorov-Smirnov test, while categorical features use a chi-square contingency test and Cramer's V as the effect size.
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

    _validate_p_threshold(p_threshold)
    categorical_set = set(categorical_columns or [])
    feature_columns = _as_feature_list(columns)
    results = []

    for column in feature_columns:
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

    return pd.DataFrame(results, columns=RESULT_COLUMNS)
