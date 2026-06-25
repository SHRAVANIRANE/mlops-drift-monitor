import React from "react";
import VectorCube from "../ui/VectorCube";
import SignalBars from "./SignalBars";
import DriftTable from "./DriftTable";
import FeatureDetailsPanel from "./FeatureDetailsPanel";
import RcaPanel from "../rca/RcaPanel";
import Panel from "../ui/Panel";
import { formatDecimal } from "../../utils/formatters";

export default function DriftAnalysisPanel({
  data,
  rows,
  topSignal,
  summary,
  activeFeature,
  featureDetails,
  onSelectFeature,
}) {
  return (
    <div className="dashboardStack">
      <Panel className="analysisHero">
        <div>
          <span>Drift Analysis</span>
          <h2>{activeFeature ?? topSignal.feature}</h2>
          <p>
            Highest observed movement from {summary.monitored_feature_count} monitored signals.
            Current top score: {formatDecimal(topSignal.drift_score, 2)}.
          </p>
        </div>
        <VectorCube />
      </Panel>
      <section className="dashboardGrid analysisGrid">
        <SignalBars rows={rows} onSelectFeature={onSelectFeature} />
        <DriftTable
          rows={rows}
          selectedFeature={activeFeature}
          onSelectFeature={onSelectFeature}
        />
      </section>
      <FeatureDetailsPanel featureDetails={featureDetails} />
      <RcaPanel data={data} feature={activeFeature ?? topSignal.feature} />
    </div>
  );
}
