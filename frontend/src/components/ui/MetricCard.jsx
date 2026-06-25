import React from "react";

export default function MetricCard({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <article className={`metricTile ${tone}`}>
      <Icon size={21} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
