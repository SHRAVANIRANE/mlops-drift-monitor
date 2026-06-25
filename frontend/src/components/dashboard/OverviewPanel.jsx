import React from "react";
import { Database, Activity, AlertTriangle, Brain } from "lucide-react";
import MetricCard from "../ui/MetricCard";
import DriftScoreCard from "./DriftScoreCard";
import TrendCard from "./TrendCard";
import MonitoringPayloadPanel from "../monitoring/MonitoringPayloadPanel";
import DriftTable from "../monitoring/DriftTable";
import { formatInteger, formatFractionPercent } from "../../utils/formatters";

export default function OverviewPanel({ data, driftScore, summary, topSignal, rows, live, onSelectFeature }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardGrid topMetrics">
        <DriftScoreCard driftScore={driftScore} summary={summary} />
        <TrendCard driftScore={driftScore} />
      </section>

      <MonitoringPayloadPanel data={data} topSignal={topSignal} live={live} />

      <section className="miniMetricGrid">
        <MetricCard icon={Database} label="Reference Rows" value={formatInteger(summary.reference_rows)} />
        <MetricCard icon={Activity} label="Incoming Rows" value={formatInteger(summary.incoming_rows)} />
        <MetricCard
          icon={AlertTriangle}
          label="Drift Rate"
          value={formatFractionPercent(summary.drift_rate, 1)}
          tone="danger"
        />
        <MetricCard icon={Brain} label="Top Signal" value={topSignal.feature} />
      </section>

      <DriftTable rows={rows.slice(0, 8)} onSelectFeature={onSelectFeature} />
    </div>
  );
}
