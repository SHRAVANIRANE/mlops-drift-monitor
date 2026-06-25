import React from "react";
import { statusClass, severityClass, formatDecimal } from "../../utils/formatters";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";
import SectionHeader from "../ui/SectionHeader";

export default function DriftTable({ rows, selectedFeature, onSelectFeature }) {
  return (
    <Panel className="tablePanel">
      <SectionHeader
        variant="panel"
        title="Monitoring Snapshot"
        actions={<strong>{rows.length} signals</strong>}
      />
      <div className="tableFrame">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Type</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Score</th>
              <th>p-value</th>
              <th>Shift</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.feature}
                className={selectedFeature === row.feature ? "selectedRow" : ""}
                onClick={() => onSelectFeature?.(row.feature)}
              >
                <td>{row.feature}</td>
                <td>{row.type}</td>
                <td>
                  <Badge variant="pill" tone={statusClass(row.status)}>{row.status}</Badge>
                </td>
                <td>
                  <Badge variant="severity" tone={severityClass(row.severity)}>{row.severity}</Badge>
                </td>
                <td>{formatDecimal(row.drift_score, 2)}</td>
                <td>{formatDecimal(row.p_value, 4)}</td>
                <td>{row.shift}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
