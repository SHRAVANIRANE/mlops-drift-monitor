export function formatInteger(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US").format(Number(value));
}

export function formatDecimal(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return Number(value).toFixed(digits);
}

export function formatFractionPercent(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatPercentValue(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return `${Number(value).toFixed(digits)}%`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function severityClass(severity) {
  return String(severity || "low").toLowerCase();
}

export function statusClass(status) {
  return String(status || "stable").toLowerCase();
}

export function formatLastUpdate(value) {
  if (!value) {
    return "waiting for data";
  }

  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return "waiting for data";
  }

  const minutes = Math.max(0, Math.round((Date.now() - stamp.getTime()) / 60000));
  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} mins ago`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

export function getRows(data) {
  const rows = data?.display_rows ?? [];
  return rows.map((row) => ({
    ...row,
    status: row.status ?? "Stable",
    severity: row.severity ?? "Low",
    drift_score: Number(row.drift_score) || 0,
  }));
}

export function getDriftScore(summary) {
  const rate = clamp(Number(summary?.drift_rate ?? 0), 0, 1);
  return clamp(Math.round(100 - rate * 100), 1, 99);
}

export function getTopSignal(data, rows = []) {
  if (data?.top_signal) {
    return data.top_signal;
  }

  if (rows.length > 0) {
    return {
      feature: rows[0].feature,
      test: rows[0].test ?? rows[0].type,
      drift_score: rows[0].drift_score,
      p_value: rows[0].p_value,
      status: rows[0].status,
      severity: rows[0].severity,
    };
  }

  return {
    feature: "No signal selected",
    test: "n/a",
    drift_score: 0,
    p_value: null,
    status: "Stable",
    severity: "Low",
  };
}

export function formatMetricLabel(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMetricValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "n/a";
    }

    return Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(2);
  }

  return String(value);
}
