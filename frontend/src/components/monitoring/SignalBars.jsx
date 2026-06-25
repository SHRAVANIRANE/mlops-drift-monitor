import React from "react";
import { formatDecimal } from "../../utils/formatters";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";

export default function SignalBars({ rows, onSelectFeature }) {
  const maxScore = Math.max(...rows.map((row) => Number(row.drift_score) || 0), 0.01);

  return (
    <Panel as="article" className="signalPanel">
      <SectionHeader
        variant="panel"
        title="Signal Strength"
        actions={<strong>Score</strong>}
      />
      <div className="signalList">
        {rows.map((row) => (
          <button
            className="signalRow"
            key={row.feature}
            type="button"
            onClick={() => onSelectFeature?.(row.feature)}
          >
            <span>{row.feature}</span>
            <div>
              <span style={{ width: `${Math.max((row.drift_score / maxScore) * 100, 4)}%` }} />
            </div>
            <strong>{formatDecimal(row.drift_score, 2)}</strong>
          </button>
        ))}
      </div>
    </Panel>
  );
}
