import React from "react";
import MonitoringPayloadPanel from "./MonitoringPayloadPanel";
import FeatureDetailsPanel from "./FeatureDetailsPanel";
import RcaPanel from "../rca/RcaPanel";

export default function PromptPerformancePanel({ data, topSignal, activeFeature, featureDetails }) {
  return (
    <div className="dashboardStack">
      <MonitoringPayloadPanel data={data} topSignal={topSignal} live />
      <FeatureDetailsPanel featureDetails={featureDetails} />
      <RcaPanel data={data} feature={activeFeature ?? topSignal.feature} />
    </div>
  );
}
