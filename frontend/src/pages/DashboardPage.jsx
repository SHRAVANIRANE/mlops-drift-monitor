import React, { useState, useEffect } from "react";
import { Loader2, Plus, HelpCircle, Radio, AlertTriangle } from "lucide-react";
import { DASHBOARD_SECTIONS, EMPTY_SUMMARY } from "../constants";
import { getRows, getDriftScore, getTopSignal, formatLastUpdate } from "../utils/formatters";
import TopNav from "../components/layout/TopNav";
import EmptyMonitoringPanel from "../components/monitoring/EmptyMonitoringPanel";
import LlmDriftPanel from "../components/dashboard/LlmDriftPanel";
import LlmPlaygroundPanel from "../components/playground/LlmPlaygroundPanel";
import OverviewPanel from "../components/dashboard/OverviewPanel";
import DriftAnalysisPanel from "../components/monitoring/DriftAnalysisPanel";
import PromptPerformancePanel from "../components/monitoring/PromptPerformancePanel";
import TokenUsagePanel from "../components/monitoring/TokenUsagePanel";
import SettingsPanel from "../components/monitoring/SettingsPanel";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";

export default function DashboardPage({
  activeSection,
  setActiveSection,
  data,
  error,
  loading,
  mode,
  setMode,
  ageThreshold,
  setAgeThreshold,
  pThreshold,
  setPThreshold,
  uploadFile,
  setUploadFile,
  reload,
  requestNonce,
  onLanding,
  onDashboard,
  theme,
  toggleTheme,
}) {
  const rows = getRows(data);
  const summary = data?.summary ?? EMPTY_SUMMARY;
  const driftScore = getDriftScore(summary);
  const topSignal = getTopSignal(data, rows);
  const lastUpdate = formatLastUpdate(data?.generated_at);
  const hasData = Boolean(data);
  const defaultFeature = data?.top_signal?.feature ?? rows[0]?.feature ?? null;
  const [selectedFeature, setSelectedFeature] = useState(defaultFeature);
  const activeFeature = selectedFeature ?? defaultFeature;
  const featureDetails = activeFeature ? data?.feature_details?.[activeFeature] : null;
  const sourceLabel =
    data?.source?.label ??
    (mode === "upload" ? "Uploaded batch" : `Simulated batch: age < ${ageThreshold}`);

  useEffect(() => {
    if (!defaultFeature) {
      setSelectedFeature(null);
      return;
    }

    setSelectedFeature((current) =>
      current && data?.feature_details?.[current] ? current : defaultFeature,
    );
  }, [data, defaultFeature]);

  return (
    <div className="dashboardPage">
      <TopNav onLanding={onLanding} onDashboard={onDashboard} activeItem="Models" theme={theme} toggleTheme={toggleTheme} />

      <div className="dashboardShell">
        <aside className="dashboardSidebar">
          <div className="sidebarProduct">
            <strong>Driftium Monitor</strong>
            <span>Enterprise Tier</span>
          </div>

          <nav className="sideNav" aria-label="Dashboard navigation">
            <div className="sidebarGroupLabel">LLM Monitoring</div>
            {DASHBOARD_SECTIONS.filter((s) => s.id.startsWith("llm_")).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={activeSection === item.id ? "active" : ""}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={24} />
                  {item.label}
                </button>
              );
            })}

            <div className="sidebarGroupLabel">Dataset Monitoring</div>
            {DASHBOARD_SECTIONS.filter((s) => !s.id.startsWith("llm_") && s.id !== "settings").map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={activeSection === item.id ? "active" : ""}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={24} />
                  {item.label}
                </button>
              );
            })}

            <div className="sidebarGroupLabel">Configuration</div>
            {DASHBOARD_SECTIONS.filter((s) => s.id === "settings").map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={activeSection === item.id ? "active" : ""}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={24} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="sidebarFooter">
            <Button variant="newAnalysis" type="button" onClick={reload} disabled={loading}>
              {loading ? <Loader2 size={24} className="spinner" /> : <Plus size={26} />}
              New Analysis
            </Button>
            <button className="supportLink" type="button">
              <HelpCircle size={22} />
              Support
            </button>
            <button className="supportLink" type="button">
              <Radio size={22} />
              API Status
            </button>
          </div>
        </aside>

        <main className="dashboardMain">
          <SectionHeader
            variant="dashboard"
            title={activeSection === "llm_drift" ? "LLM Drift Monitoring" : "Driftium Monitoring Dashboard"}
            subtitle={
              activeSection === "llm_drift"
                ? "Monitor semantic drift in LLM responses using embeddings, centroid distance, and MMD scoring."
                : sourceLabel
            }
            actions={
              <div className="lastUpdate">
                <span>Last Update</span>
                <strong>{lastUpdate}</strong>
              </div>
            }
          />

          {error && (
            <div className="apiNotice">
              <AlertTriangle size={18} />
              Could not load monitoring data: {error === "Failed to fetch" ? "Cannot connect to monitoring API." : error}
            </div>
          )}

          {loading && !error && (
            <div className="apiNotice live">
              <Loader2 size={18} className="spinner" />
              Refreshing production telemetry
            </div>
          )}

          {!hasData && !loading && !error && !activeSection.startsWith("llm_") && activeSection !== "settings" && (
            <EmptyMonitoringPanel mode={mode} />
          )}

          {activeSection === "llm_drift" && (
            <LlmDriftPanel
              activeSection={activeSection}
              requestNonce={requestNonce}
              setActiveSection={setActiveSection}
            />
          )}

          {activeSection === "llm_playground" && (
            <LlmPlaygroundPanel reload={reload} />
          )}

          {activeSection === "overview" && (
            hasData && (
              <OverviewPanel
                data={data}
                driftScore={driftScore}
                summary={summary}
                topSignal={topSignal}
                rows={rows}
                live={Boolean(data && !error)}
                onSelectFeature={setSelectedFeature}
              />
            )
          )}

          {activeSection === "drift" && (
            hasData && (
              <DriftAnalysisPanel
                data={data}
                rows={rows}
                topSignal={topSignal}
                summary={summary}
                activeFeature={activeFeature}
                featureDetails={featureDetails}
                onSelectFeature={setSelectedFeature}
              />
            )
          )}

          {activeSection === "prompts" && (
            hasData && (
              <PromptPerformancePanel
                data={data}
                topSignal={topSignal}
                activeFeature={activeFeature}
                featureDetails={featureDetails}
              />
            )
          )}

          {activeSection === "tokens" && hasData && <TokenUsagePanel summary={summary} />}

          {activeSection === "settings" && (
            <SettingsPanel
              mode={mode}
              setMode={setMode}
              ageThreshold={ageThreshold}
              setAgeThreshold={setAgeThreshold}
              pThreshold={pThreshold}
              setPThreshold={setPThreshold}
              uploadFile={uploadFile}
              setUploadFile={setUploadFile}
              reload={reload}
              loading={loading}
            />
          )}
        </main>
      </div>
    </div>
  );
}
