import numpy as np
from dataclasses import dataclass
from typing import Tuple


# -----------------------------
# Data structure (clean design)
# -----------------------------
@dataclass(frozen=True)
class DriftScore:
    centroid_score: float
    mmd_score: float
    severity: str
    window_size: int


# -----------------------------
# Cosine distance
# -----------------------------
def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    return 1 - (np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# -----------------------------
# Centroid drift (FAST + baseline)
# -----------------------------
def centroid_drift(baseline: np.ndarray, current: np.ndarray) -> float:
    baseline_mean = np.mean(baseline, axis=0)
    current_mean = np.mean(current, axis=0)
    return cosine_distance(baseline_mean, current_mean)


# -----------------------------
# MMD drift (distribution-level)
# -----------------------------
def rbf_kernel(x: np.ndarray, y: np.ndarray, gamma: float = 1.0) -> float:
    return np.exp(-gamma * np.linalg.norm(x - y) ** 2)


def compute_mmd(baseline: np.ndarray, current: np.ndarray) -> float:
    xx = np.mean([rbf_kernel(x, y) for x in baseline for y in baseline])
    yy = np.mean([rbf_kernel(x, y) for x in current for y in current])
    xy = np.mean([rbf_kernel(x, y) for x in baseline for y in current])
    return xx + yy - 2 * xy


# -----------------------------
# Severity classification
# -----------------------------
def classify_severity(score: float) -> str:
    if score > 0.7:
        return "CRITICAL"
    elif score > 0.5:
        return "HIGH"
    elif score > 0.3:
        return "MEDIUM"
    else:
        return "LOW"


# -----------------------------
# Main scoring function
# -----------------------------
def compute_drift(
    baseline: np.ndarray,
    current: np.ndarray
) -> DriftScore:

    centroid_score = centroid_drift(baseline, current)
    mmd_score = compute_mmd(baseline, current)

    severity = classify_severity(centroid_score)

    return DriftScore(
        centroid_score=centroid_score,
        mmd_score=mmd_score,
        severity=severity,
        window_size=len(current)
    )