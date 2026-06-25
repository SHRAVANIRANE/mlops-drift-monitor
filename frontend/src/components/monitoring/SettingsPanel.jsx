import React from "react";
import { SlidersHorizontal, Upload, RefreshCw } from "lucide-react";
import SpinnerLabel from "../ui/SpinnerLabel";
import Panel from "../ui/Panel";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

export default function SettingsPanel({
  mode,
  setMode,
  ageThreshold,
  setAgeThreshold,
  pThreshold,
  setPThreshold,
  uploadFile,
  setUploadFile,
  reload,
  loading,
}) {
  return (
    <Panel className="settingsPanel">
      <SectionHeader
        variant="comparison"
        title="Monitoring Controls"
        icon={SlidersHorizontal}
      />

      <div className="settingsGrid">
        <Card as="label" variant="control">
          <span>Incoming source</span>
          <div className="segmentedControl" aria-label="Incoming batch source">
            <button
              className={mode === "simulated" ? "active" : ""}
              type="button"
              onClick={() => setMode("simulated")}
            >
              Simulated
            </button>
            <button
              className={mode === "upload" ? "active" : ""}
              type="button"
              onClick={() => setMode("upload")}
            >
              Upload
            </button>
          </div>
        </Card>

        <Card as="label" variant="control" className={mode !== "simulated" ? "disabled" : ""}>
          <span>Age cutoff</span>
          <strong>{ageThreshold}</strong>
          <input
            type="range"
            min="20"
            max="60"
            value={ageThreshold}
            disabled={mode !== "simulated"}
            onChange={(event) => setAgeThreshold(Number(event.target.value))}
          />
        </Card>

        <Card as="label" variant="control">
          <span>P-value threshold</span>
          <strong>{pThreshold.toFixed(3)}</strong>
          <input
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            value={pThreshold}
            onChange={(event) => setPThreshold(Number(event.target.value))}
          />
        </Card>

        <Card as="label" variant="upload" className={mode !== "upload" ? "disabled" : ""}>
          <Upload size={22} />
          <span>{uploadFile?.name || "Choose CSV batch"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={mode !== "upload"}
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          />
        </Card>
      </div>

      <Button variant="cyan" type="button" onClick={reload} disabled={loading}>
        {loading ? <SpinnerLabel label="Refreshing" /> : <RefreshCw size={18} />}
        {!loading && "Refresh Telemetry"}
      </Button>
    </Panel>
  );
}
