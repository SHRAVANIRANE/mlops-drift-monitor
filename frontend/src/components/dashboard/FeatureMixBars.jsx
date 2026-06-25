import React from "react";
import { formatInteger } from "../../utils/formatters";

export default function FeatureMixBars({ summary }) {
  const numericCount = Number(summary.numeric_feature_count) || 0;
  const categoricalCount = Number(summary.categorical_feature_count) || 0;
  const total = Math.max(numericCount + categoricalCount, 1);
  const rows = [
    { label: "Numeric", value: numericCount },
    { label: "Categorical", value: categoricalCount },
  ];

  return (
    <div className="signalList">
      {rows.map((row) => (
        <div className="signalRow" key={row.label}>
          <span>{row.label}</span>
          <div>
            <span style={{ width: `${Math.max((row.value / total) * 100, 4)}%` }} />
          </div>
          <strong>{formatInteger(row.value)}</strong>
        </div>
      ))}
    </div>
  );
}
