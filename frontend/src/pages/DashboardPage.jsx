import React, { useState, useEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Sun,
  Moon,
  Bell,
  Search,
  ChevronDown,
  Activity,
  Database,
  Brain,
  SlidersHorizontal,
  Settings,
  LayoutDashboard,
  TrendingUp,
  FileText,
  User,
} from "lucide-react";
import { EMPTY_SUMMARY } from "../constants";
import { getRows, getDriftScore, getTopSignal, formatLastUpdate } from "../utils/formatters";
import EmptyMonitoringPanel from "../components/monitoring/EmptyMonitoringPanel";
import LlmDriftPanel from "../components/dashboard/LlmDriftPanel";
import LlmPlaygroundPanel from "../components/playground/LlmPlaygroundPanel";
import OverviewPanel from "../components/dashboard/OverviewPanel";
import DriftAnalysisPanel from "../components/monitoring/DriftAnalysisPanel";
import PromptPerformancePanel from "../components/monitoring/PromptPerformancePanel";
import TokenUsagePanel from "../components/monitoring/TokenUsagePanel";
import SettingsPanel from "../components/monitoring/SettingsPanel";

// ─── Sidebar nav structure matching Figma ─────────────────────────────────────
const MONITOR_ITEMS = [
  { id: "overview",        label: "Overview",         icon: LayoutDashboard },
  { id: "drift",           label: "Data Monitoring",  icon: TrendingUp },
  { id: "llm_drift",       label: "LLM Monitoring",   icon: Activity },
  { id: "prompts",         label: "RCA Reports",      icon: FileText },
];

const TOOLS_ITEMS = [
  { id: "llm_playground",  label: "Prompt Playground", icon: SlidersHorizontal },
];

const CONFIG_ITEMS = [
  { id: "settings",        label: "Settings",          icon: Settings },
];

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

  // Resolve active section display name
  const activeSectionLabel = [
    ...MONITOR_ITEMS, ...TOOLS_ITEMS, ...CONFIG_ITEMS,
  ].find((s) => s.id === activeSection)?.label ?? "Overview";

  return (
    <div className="dashboardPage dashboardPageV2">

      {/* ── FIGMA-STYLE TOP NAV ──────────────────────────────────────────── */}
      <header className="dashTopNav">
        {/* Left: brand + breadcrumb */}
        <div className="dashTopNavLeft">
          <button
            type="button"
            className="dashTopNavBrand"
            onClick={onLanding}
            aria-label="Go to landing page"
          >
            <span className="dashTopNavBrandIcon">
              <Activity size={14} />
            </span>
            <span>Driftium</span>
          </button>
          <span className="dashTopNavBetaBadge">BETA</span>
          <span className="dashTopNavSep">/</span>
          <div className="dashTopNavBreadcrumb">
            <span className="dashTopNavOrg">Acme Corp</span>
            <ChevronDown size={13} />
          </div>
          <span className="dashTopNavSep">/</span>
          <span className="dashTopNavPage">{activeSectionLabel}</span>
        </div>

        {/* Center: search */}
        <div className="dashTopNavSearch">
          <Search size={14} />
          <span>Search models, events, reports…</span>
          <kbd>⌘K</kbd>
        </div>

        {/* Right: actions */}
        <div className="dashTopNavRight">
          <button
            type="button"
            className="dashTopNavIconBtn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button type="button" className="dashTopNavIconBtn" aria-label="Notifications">
            <Bell size={17} />
            {error && <span className="dashTopNavNotifDot" />}
          </button>
          <button type="button" className="dashTopNavAvatar" aria-label="User profile">
            <User size={14} />
          </button>
        </div>
      </header>

      <div className="dashboardShell dashboardShellV2">

        {/* ── FIGMA-STYLE SIDEBAR ────────────────────────────────────────── */}
        <aside className="dashboardSidebar dashboardSidebarV2" aria-label="Sidebar navigation">

          {/* MONITOR group */}
          <div className="dashSideGroup">
            <div className="dashSideGroupLabel">MONITOR</div>
            {MONITOR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dashSideItem${activeSection === item.id ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {activeSection === item.id && <ChevronDown size={14} className="dashSideItemArrow" />}
                </button>
              );
            })}
          </div>

          {/* TOOLS group */}
          <div className="dashSideGroup">
            <div className="dashSideGroupLabel">TOOLS</div>
            {TOOLS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dashSideItem${activeSection === item.id ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONFIG group */}
          <div className="dashSideGroup">
            <div className="dashSideGroupLabel">CONFIG</div>
            {CONFIG_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dashSideItem${activeSection === item.id ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sidebar footer user */}
          <div className="dashSideFooter">
            {data && (
              <div className="dashSideAlertBadge">
                <span className="dashSideAlertDot" />
                {summary.drifted_feature_count > 0
                  ? `${summary.drifted_feature_count} alerts need attention`
                  : "No active alerts"}
              </div>
            )}
            <div className="dashSideUser">
              <div className="dashSideUserAvatar">A</div>
              <div className="dashSideUserInfo">
                <strong>Alex Chen</strong>
                <span>ML Eng · Acme Corp</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="dashboardMain dashboardMainV2">

          {/* Error / loading banners */}
          {error && (
            <div className="apiNotice">
              <AlertTriangle size={18} />
              Could not load monitoring data:{" "}
              {error === "Failed to fetch" ? "Cannot connect to monitoring API." : error}
            </div>
          )}
          {loading && !error && (
            <div className="apiNotice live">
              <Loader2 size={18} className="spinner" />
              Refreshing production telemetry
            </div>
          )}

          {/* Empty state for data-dependent sections */}
          {!hasData && !loading && !error &&
            !activeSection.startsWith("llm_") &&
            activeSection !== "settings" && (
              <EmptyMonitoringPanel mode={mode} />
            )}

          {/* Section panels */}
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

          {activeSection === "overview" && hasData && (
            <OverviewPanel
              data={data}
              driftScore={driftScore}
              summary={summary}
              topSignal={topSignal}
              rows={rows}
              live={Boolean(data && !error)}
              onSelectFeature={setSelectedFeature}
            />
          )}

          {activeSection === "drift" && hasData && (
            <DriftAnalysisPanel
              data={data}
              rows={rows}
              topSignal={topSignal}
              summary={summary}
              activeFeature={activeFeature}
              featureDetails={featureDetails}
              onSelectFeature={setSelectedFeature}
            />
          )}

          {activeSection === "prompts" && hasData && (
            <PromptPerformancePanel
              data={data}
              topSignal={topSignal}
              activeFeature={activeFeature}
              featureDetails={featureDetails}
            />
          )}

          {activeSection === "tokens" && hasData && (
            <TokenUsagePanel summary={summary} />
          )}

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
