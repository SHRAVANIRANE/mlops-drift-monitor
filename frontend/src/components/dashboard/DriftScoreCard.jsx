import React from "react";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";
import Badge from "../ui/Badge";

export default function DriftScoreCard({ driftScore, summary }) {
  const tone = driftScore < 70 ? "critical" : driftScore < 90 ? "warning" : "stable";

  return (
    <Panel as="article" className="driftScorePanel">
      <SectionHeader
        variant="panel"
        title="Drift Score"
        actions={
          <Badge variant="label" tone={tone}>
            {tone === "stable" ? "Stable" : tone === "warning" ? "Warning" : "Critical"}
          </Badge>
        }
      />
      <div className="scoreValue">
        <strong>{driftScore}</strong>
        <span>/100</span>
      </div>
      <div className="scoreTrack">
        <span style={{ width: `${driftScore}%` }} />
      </div>
      <p>
        {summary.drifted_feature_count} of {summary.monitored_feature_count} monitored signals
        flagged against baseline.
      </p>
    </Panel>
  );
}
