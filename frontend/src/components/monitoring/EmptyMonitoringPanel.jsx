import React from "react";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";

export default function EmptyMonitoringPanel({ mode }) {
  return (
    <Panel className="promptPanel">
      <SectionHeader
        variant="prompt"
        title="Monitoring Data"
        subtitle={
          mode === "upload"
            ? "Choose a CSV batch in Settings to request a live drift report."
            : "Start the FastAPI backend or refresh the analysis to load a live drift report."
        }
        badge="No payload"
      />
    </Panel>
  );
}
