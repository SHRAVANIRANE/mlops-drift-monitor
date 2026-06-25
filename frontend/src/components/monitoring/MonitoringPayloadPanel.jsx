import React from "react";
import { Zap } from "lucide-react";
import CodePane from "../ui/CodePane";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";
import { formatDecimal } from "../../utils/formatters";

export default function MonitoringPayloadPanel({ data, topSignal, live }) {
  const sourcePayload = {
    source: data.source?.label,
    threshold: data.threshold,
    generated_at: data.generated_at,
    monitored_columns: data.monitored_columns?.length ?? 0,
    missing_columns: data.missing_columns ?? [],
  };

  const signalPayload = {
    feature: topSignal.feature,
    status: topSignal.status,
    severity: topSignal.severity,
    test: topSignal.test,
    drift_score: topSignal.drift_score,
    p_value: topSignal.p_value,
  };

  return (
    <Panel className="comparisonPanel">
      <SectionHeader
        variant="comparison"
        title="Monitoring Payload"
        badge={live ? "Live API" : "Waiting"}
        icon={Zap}
      />
      <div className="comparisonGrid">
        <CodePane
          title="Incoming Source"
          muted
          code={JSON.stringify(sourcePayload, null, 2)}
        />
        <CodePane
          title="Top Drift Signal"
          badge={`${formatDecimal(topSignal.drift_score, 2)} score`}
          code={JSON.stringify(signalPayload, null, 2)}
        />
      </div>
    </Panel>
  );
}
