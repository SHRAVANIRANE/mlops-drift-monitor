import React from "react";

export default function LineTrend({ values }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 1000;
      const y = 170 - ((value - min) / spread) * 112;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="lineTrend" viewBox="0 0 1000 220" role="img" aria-label="30 day drift trend">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#11d8e8" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#11d8e8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[120, 280, 440, 600, 760, 920].map((x) => (
        <line key={x} x1={x} x2={x} y1="34" y2="186" />
      ))}
      <line className="thresholdLine" x1="0" x2="1000" y1="122" y2="122" />
      <polygon points={`0,178 ${points} 1000,178`} fill="url(#trendFill)" />
      <polyline points={points} />
    </svg>
  );
}
