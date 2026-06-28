import React from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  TrendingUp,
} from "lucide-react";
import { TREND_VALUES } from "../../constants";
import {
  formatDecimal,
  formatFractionPercent,
  formatInteger,
  formatLastUpdate,
} from "../../utils/formatters";
import SignalBars from "./SignalBars";
import DriftTable from "./DriftTable";
import FeatureDetailsPanel from "./FeatureDetailsPanel";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";
import MetricCard from "../ui/MetricCard";
import SectionHeader from "../ui/SectionHeader";
import LineTrend from "../charts/LineTrend";

function getScoreTone(driftScore) {
  if (driftScore < 70) return "critical";
  if (driftScore < 90) return "warning";
  return "stable";
}

function getSeverityTone(severity) {
  const normalized = String(severity ?? "").toLowerCase();

  if (normalized === "critical" || normalized === "high") {
    return "high";
  }

  if (normalized === "medium" || normalized === "warning") {
    return "medium";
  }

  return "low";
}

export default function DriftAnalysisPanel({
  data,
  rows,
  topSignal,
  driftScore,
  summary,
  activeFeature,
  featureDetails,
  onSelectFeature,
}) {
  const activeFeatureLabel = activeFeature ?? topSignal.feature;
  const scoreTone = getScoreTone(Number(driftScore));
  const severityTone = getSeverityTone(topSignal.severity);
  const monitoredCount = formatInteger(summary.monitored_feature_count);
  const driftedCount = formatInteger(summary.drifted_feature_count);
  const driftRate = formatFractionPercent(summary.drift_rate);
  const sourceLabel =
    data?.source?.label ?? "Simulated batch";

  return (
    <div className="dashboardStack driftAnalysisStack">
      <Panel className="analysisHero driftHeroPanel">
        <div className="driftHeroCopy">
          <span>Data Monitoring</span>
          <h2>Feature drift detection</h2>
          <p>
            Compare incoming production data against baseline signals and surface the largest
            statistical shifts before they cascade into downstream quality issues.
          </p>

          <div className="driftHeroMeta">
            <Badge variant="label" tone={scoreTone}>
              {scoreTone === "stable" ? "Stable" : scoreTone === "warning" ? "Warning" : "Critical"}
            </Badge>
            <Badge variant="severity" tone={severityTone}>
              {topSignal.severity}
            </Badge>
            <span>{sourceLabel}</span>
            <span>{formatLastUpdate(data?.generated_at)}</span>
          </div>
        </div>

        <div className="miniMetricGrid driftHeroMetrics">
          <MetricCard icon={Activity} label="Drift Score" value={formatDecimal(driftScore, 0)} tone="danger" />
          <MetricCard icon={AlertTriangle} label="Drifted Signals" value={driftedCount} tone={Number(summary.drifted_feature_count) > 0 ? "danger" : "neutral"} />
          <MetricCard icon={Database} label="Monitored Signals" value={monitoredCount} tone="neutral" />
          <MetricCard icon={TrendingUp} label="Drift Rate" value={driftRate} tone="neutral" />
        </div>
      </Panel>

      <Panel as="article" className="trendPanel driftTrendPanel">
        <SectionHeader
          variant="panel"
          title="Drift Score Trend"
          actions={<strong>{formatDecimal(topSignal.drift_score, 2)} top signal</strong>}
        />
        <LineTrend values={TREND_VALUES} />
        <div className="legendDots driftTrendFacts">
          <span>p-value {formatDecimal(topSignal.p_value, 4)}</span>
          <span>{topSignal.shift}</span>
          <span>{activeFeatureLabel}</span>
        </div>
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
    </div>
  );
}
