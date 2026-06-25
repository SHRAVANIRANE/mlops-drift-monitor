import React from "react";
import { Table2, Activity } from "lucide-react";
import { formatMetricLabel, formatMetricValue } from "../../utils/formatters";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";

export default function FeatureDetailsPanel({ featureDetails }) {
  if (!featureDetails) {
    return (
      <Panel className="promptPanel">
        <SectionHeader
          variant="prompt"
          title="Feature Details"
          subtitle="Select a signal from the monitoring table to inspect its backend details."
          badge="No feature"
        />
      </Panel>
    );
  }

  const metrics = Object.entries(featureDetails.metrics ?? {});
  const chartRows = featureDetails.chart ?? [];
  const labelKey = featureDetails.chart_label ?? "bucket";

  return (
    <Panel className="settingsPanel">
      <SectionHeader
        variant="comparison"
        title={featureDetails.feature}
        badge={featureDetails.status}
        icon={Table2}
      />

      <div className="settingsGrid">
        {metrics.map(([key, value]) => (
          <div className="controlCard" key={key}>
            <span>{formatMetricLabel(key)}</span>
            <strong>{formatMetricValue(value)}</strong>
          </div>
        ))}
      </div>

      {featureDetails.shift_summary && (
        <div className="apiNotice live">
          <Activity size={18} />
          {featureDetails.shift_summary}
        </div>
      )}

      {chartRows.length > 0 && (
        <div className="tableFrame">
          <table>
            <thead>
              <tr>
                <th>{formatMetricLabel(labelKey)}</th>
                <th>Reference</th>
                <th>Incoming</th>
              </tr>
            </thead>
            <tbody>
              {chartRows.map((row) => (
                <tr key={row[labelKey]}>
                  <td>{row[labelKey]}</td>
                  <td>{formatMetricValue(row.reference)}</td>
                  <td>{formatMetricValue(row.incoming)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
