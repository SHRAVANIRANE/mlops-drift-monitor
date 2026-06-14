import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Blocks,
  Brain,
  Code,
  Database,
  Gauge,
  HelpCircle,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Upload,
  Zap,
} from "lucide-react";

import {
  fetchSimulatedMonitoring,
  generateRca,
  uploadMonitoringBatch,
  generateLlmResponse,
  setLlmBaseline,
  fetchLlmDrift,
  fetchLlmDriftHistory,
  fetchLlmSamples,
} from "./api.js";

const TOP_NAV = ["Models", "Integrations", "Alerts", "Docs"];

const DASHBOARD_SECTIONS = [
  { id: "llm_drift", label: "LLM Drift", icon: Activity },
  { id: "llm_playground", label: "Prompt Playground", icon: SlidersHorizontal },
  { id: "overview", label: "Overview", icon: Blocks },
  { id: "drift", label: "Drift Analysis", icon: BarChart3 },
  { id: "prompts", label: "RCA", icon: Brain },
  { id: "tokens", label: "Feature Mix", icon: Radio },
  { id: "settings", label: "Settings", icon: Settings },
];


const TREND_VALUES = [46, 43, 52, 38, 58, 60, 49, 72, 78, 68, 86, 89, 75, 72, 66, 69, 84];
const TOKEN_BARS = [34, 50, 45, 66, 38, 78];

const EMPTY_SUMMARY = {
  reference_rows: 0,
  incoming_rows: 0,
  monitored_feature_count: 0,
  numeric_feature_count: 0,
  categorical_feature_count: 0,
  drifted_feature_count: 0,
  drift_rate: 0,
};


function formatInteger(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US").format(Number(value));
}

function formatDecimal(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return Number(value).toFixed(digits);
}

function formatFractionPercent(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function formatPercentValue(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return `${Number(value).toFixed(digits)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function severityClass(severity) {
  return String(severity || "low").toLowerCase();
}

function statusClass(status) {
  return String(status || "stable").toLowerCase();
}

function formatLastUpdate(value) {
  if (!value) {
    return "waiting for data";
  }

  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return "waiting for data";
  }

  const minutes = Math.max(0, Math.round((Date.now() - stamp.getTime()) / 60000));
  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} mins ago`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function getRows(data) {
  const rows = data?.display_rows ?? [];
  return rows.map((row) => ({
    ...row,
    status: row.status ?? "Stable",
    severity: row.severity ?? "Low",
    drift_score: Number(row.drift_score) || 0,
  }));
}

function getDriftScore(summary) {
  const rate = clamp(Number(summary?.drift_rate ?? 0), 0, 1);
  return clamp(Math.round(100 - rate * 100), 1, 99);
}

function getTopSignal(data, rows = []) {
  if (data?.top_signal) {
    return data.top_signal;
  }

  if (rows.length > 0) {
    return {
      feature: rows[0].feature,
      test: rows[0].test ?? rows[0].type,
      drift_score: rows[0].drift_score,
      p_value: rows[0].p_value,
      status: rows[0].status,
      severity: rows[0].severity,
    };
  }

  return {
    feature: "No signal selected",
    test: "n/a",
    drift_score: 0,
    p_value: null,
    status: "Stable",
    severity: "Low",
  };
}

function formatMetricLabel(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetricValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "n/a";
    }

    return Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(2);
  }

  return String(value);
}

function TopNav({ onDashboard, onLanding, activeItem = "Models" }) {
  return (
    <header className="topNav">
      <button className="brandButton" type="button" onClick={onLanding}>
        Driftium
      </button>
      <nav className="navLinks" aria-label="Primary navigation">
        {TOP_NAV.map((item) => (
          <button
            key={item}
            className={item === activeItem ? "active" : ""}
            type="button"
            onClick={item === "Models" ? onDashboard : undefined}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="navActions">
        <button className="signinButton" type="button">
          Sign In
        </button>
        <button className="cyanButton compact" type="button" onClick={onDashboard}>
          Get Started
        </button>
      </div>
    </header>
  );
}

function SpinnerLabel({ label }) {
  return (
    <span className="spinnerLabel">
      <Loader2 size={16} />
      {label}
    </span>
  );
}

function LandingPage({ onEnterDashboard }) {
  return (
    <div className="marketingPage">
      <TopNav onDashboard={onEnterDashboard} onLanding={() => window.scrollTo(0, 0)} />

      <main>
        <section className="marketingHero dotMatrix">
          <div className="heroInner">
            <span className="signalBadge">
              <Activity size={13} />
              Real-time LLM observability
            </span>
            <h1>
               <span className="gradientText">Driftium</span>
            </h1>
      

            <p>
              Driftium tracks semantic drift, output variance, and model decay in real-time. Turn
              black-box AI into transparent, measurable assets.
            </p>
            <div className="heroActions">
              <button className="cyanButton" type="button" onClick={onEnterDashboard}>
                Enter Dashboard
                <ArrowRight size={18} />
              </button>
              <button className="outlineButton" type="button">
                <Code size={17} />
                View Docs
              </button>
            </div>
          </div>
        </section>

        <section className="featureMosaic" aria-label="Monitoring capabilities">
          <article className="featureCard vectorCard">
            <div className="featureCopy">
              <span className="miniEyebrow">
                <Table2 size={15} />
                Drift Analysis
              </span>
              <h2>Semantic Drift Vectors</h2>
              <p>
                Analyze model output deviations across high-dimensional latent spaces to prevent
                hallucination cycles.
              </p>
            </div>
            <VectorCube />
          </article>

          <article className="featureCard anomalyCard">
            <AlertTriangle size={22} />
            <h2>Anomalies</h2>
            <p>Instant alerts for production decay.</p>
            <strong>0.04%</strong>
            <span>Critical threshold</span>
          </article>

          <article className="featureCard latencyCard">
            <Gauge size={22} />
            <span className="livePill">Live</span>
            <div>
              <h2>Token Latency</h2>
              <p>Monitoring global inference speeds.</p>
            </div>
            <TokenBars compact />
          </article>

          <article className="featureCard safetyCard">
            <div className="shieldTile">
              <ShieldCheck size={38} />
            </div>
            <div>
              <h2>Safety Guardrails</h2>
              <p>
                Integrated policy enforcement for enterprise models. Block toxic outputs before
                they reach the client.
              </p>
              <div className="tagRow">
                <span>PII Redaction</span>
                <span>Bias Control</span>
              </div>
            </div>
          </article>
        </section>

        <section className="ctaBand">
          <h2>Ready to secure your AI lifecycle?</h2>
          <p>Join 2,000+ ML teams monitoring their production environments with Driftium.</p>
          <div className="heroActions">
            <button className="cyanButton" type="button" onClick={onEnterDashboard}>
              Start Free Trial
            </button>
            <button className="outlineButton" type="button">
              Request Demo
            </button>
          </div>
        </section>
      </main>

      <footer className="siteFooter">
        <div>
          <strong>Driftium</strong>
          <span>Copyright 2024 Driftium AI. Precision drift monitoring for ML systems.</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#security">Security</a>
          <a href="#status">Status</a>
        </nav>
      </footer>
    </div>
  );
}

function VectorCube() {
  return (
    <div className="vectorCube" aria-hidden="true">
      <div className="cubeCore" />
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function TokenBars({ compact = false }) {
  return (
    <div className={compact ? "tokenBars compact" : "tokenBars"} aria-hidden="true">
      {TOKEN_BARS.map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

function LlmDriftPanel() {
  const [drift, setDrift] = useState(null);
  const [history, setHistory] = useState([]);
  const [samples, setSamples] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [driftRes, historyRes, samplesRes] = await Promise.all([
          fetchLlmDrift(),
          fetchLlmDriftHistory(),
          fetchLlmSamples()
        ]);
        setDrift(driftRes);
        setHistory(historyRes);
        setSamples(samplesRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="apiNotice live">
        <Loader2 size={18} />
        Loading LLM observability data...
      </div>
    );
  }

  if (error || drift?.error) {
    const errorMsg = error || drift?.error;
    return (
      <div className="dashboardStack">
        <div className="apiNotice">
          <AlertTriangle size={18} />
          {errorMsg.includes("Need both baseline") ? (
            <span>
              <strong>No baseline set.</strong> Please run the simulator or establish a baseline via CLI/API first.
            </span>
          ) : (
            `Failed to load LLM monitoring data: ${errorMsg}`
          )}
        </div>
      </div>
    );
  }

  const centroidVal = drift?.centroid_score ?? 0;
  const healthScore = Math.max(0, Math.min(100, Math.round((1 - centroidVal) * 100)));
  const tone = drift?.severity === "CRITICAL" || drift?.severity === "HIGH" ? "critical" : drift?.severity === "MEDIUM" ? "warning" : "stable";

  const trendValues = history.map(item => Math.max(0, Math.min(100, Math.round((1 - item.centroid_score) * 100))));
  const displayTrendValues = trendValues.length > 1 ? trendValues : Array(10).fill(healthScore);

  return (
    <div className="dashboardStack">
      <section className="dashboardGrid topMetrics">
        <article className="dashboardPanel driftScorePanel">
          <div className="panelHeader">
            <span>LLM Semantic Health</span>
            <strong className={`statusLabel ${tone}`}>
              {drift?.severity || "LOW"}
            </strong>
          </div>
          <div className="scoreValue">
            <strong>{healthScore}</strong>
            <span>/100</span>
          </div>
          <div className="scoreTrack">
            <span style={{ width: `${healthScore}%` }} />
          </div>
          <p>
            Centroid cosine distance: {formatDecimal(drift?.centroid_score, 4)}. MMD Score: {formatDecimal(drift?.mmd_score, 4)}.
          </p>
        </article>

        <article className="dashboardPanel trendPanel">
          <div className="panelHeader">
            <span>Semantic Stability Trend</span>
            <div className="legendDots">
              <span className="driftDot">Health %</span>
              <span className="thresholdDot">Critical Limit</span>
            </div>
          </div>
          <LineTrend values={displayTrendValues} />
        </article>
      </section>

      <section className="miniMetricGrid">
        <MetricTile icon={Activity} label="Centroid Distance" value={formatDecimal(drift?.centroid_score, 4)} />
        <MetricTile icon={SlidersHorizontal} label="MMD Score" value={formatDecimal(drift?.mmd_score, 4)} />
        <MetricTile icon={Database} label="Baseline Size" value={samples?.baseline?.length ?? 0} />
        <MetricTile icon={Zap} label="Telemetry Size" value={samples?.current?.length ?? 0} />
      </section>

      <section className="dashboardPanel comparisonPanel">
        <div className="comparisonTitle">
          <div>
            <Table2 size={28} />
            <h2>Active LLM Samples</h2>
          </div>
          <span>Side-by-Side</span>
        </div>
        <div className="comparisonGrid">
          <CodePane
            title="Baseline Response Samples"
            muted
            code={JSON.stringify(samples?.baseline || [], null, 2)}
          />
          <CodePane
            title="Current Response Samples"
            code={JSON.stringify(samples?.current || [], null, 2)}
          />
        </div>
      </section>
    </div>
  );
}

function LlmPlaygroundPanel() {
  const [prompt, setPrompt] = useState("");
  const [lastResponse, setLastResponse] = useState(null);
  const [samples, setSamples] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [baselineSetting, setBaselineSetting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSamples() {
    try {
      const res = await fetchLlmSamples();
      setSamples(res);
    } catch (err) {
      console.error("Failed to load samples", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSamples();
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const res = await generateLlmResponse(prompt);
      setLastResponse(res);
      setPrompt("");
      setSuccess("Response generated and stored successfully.");
      await loadSamples();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSetBaseline() {
    setBaselineSetting(true);
    setError("");
    setSuccess("");
    try {
      const res = await setLlmBaseline();
      setSuccess(`${res.message} (Baseline size: ${res.baseline_size})`);
      setLastResponse(null);
      await loadSamples();
    } catch (err) {
      setError(err.message);
    } finally {
      setBaselineSetting(false);
    }
  }

  return (
    <div className="dashboardStack">
      <section className="dashboardPanel settingsPanel">
        <div className="comparisonTitle">
          <div>
            <SlidersHorizontal size={28} />
            <h2>Interactive LLM Playground</h2>
          </div>
        </div>

        <div className="playgroundGrid" style={{ padding: "30px" }}>
          <form onSubmit={handleGenerate}>
            <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
              Test Prompt
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="promptInput"
                placeholder="Enter a prompt (e.g., 'How to cook pasta?')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={generating}
              />
              <button className="cyanButton compact" type="submit" disabled={generating || !prompt.trim()}>
                {generating ? (
                  <span className="spinnerLabel">
                    <Loader2 size={16} />
                  </span>
                ) : (
                  <Zap size={16} />
                )}
                Generate
              </button>
            </div>
          </form>

          {error && (
            <div className="apiNotice" style={{ marginTop: "15px" }}>
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="apiNotice live" style={{ marginTop: "15px" }}>
              <Zap size={18} />
              {success}
            </div>
          )}

          {lastResponse && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={{ marginBottom: "8px" }}>Last Response</h3>
              <CodePane
                title={`Prompt: "${lastResponse.prompt}"`}
                code={lastResponse.response}
              />
            </div>
          )}

          <div className="playgroundActionRow" style={{ marginTop: "30px", borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
            <div>
              <h3>Establish Baseline</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "4px" }}>
                Prompts generated during this session will be captured as the current distribution. Click below to promote them as the new drift baseline.
              </p>
            </div>
            <button
              className="outlineButton"
              type="button"
              onClick={handleSetBaseline}
              disabled={baselineSetting || !samples?.current?.length}
              style={{ marginLeft: "auto" }}
            >
              {baselineSetting ? (
                <span className="spinnerLabel">
                  <Loader2 size={16} />
                </span>
              ) : (
                <Database size={16} />
              )}
              Set Baseline
            </button>
          </div>
        </div>
      </section>

      <section className="dashboardPanel comparisonPanel">
        <div className="comparisonTitle">
          <div>
            <Table2 size={28} />
            <h2>Drift Samples Status</h2>
          </div>
          <span>Active Pools</span>
        </div>
        {loading ? (
          <div className="apiNotice live" style={{ margin: "20px" }}>
            <Loader2 size={18} />
            Loading active pools...
          </div>
        ) : (
          <div className="comparisonGrid">
            <CodePane
              title={`Baseline Responses (${samples?.baseline?.length || 0})`}
              muted
              code={JSON.stringify(samples?.baseline || [], null, 2)}
            />
            <CodePane
              title={`Current Session Responses (${samples?.current?.length || 0})`}
              code={JSON.stringify(samples?.current || [], null, 2)}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardPage({
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
  onLanding,
  onDashboard,
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
      <TopNav onLanding={onLanding} onDashboard={onDashboard} activeItem="Models" />

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
            <button className="newAnalysisButton" type="button" onClick={reload} disabled={loading}>
              {loading ? <Loader2 size={24} /> : <Plus size={26} />}
              New Analysis
            </button>
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
          <header className="dashboardTitleRow">
            <div>
              <h1>
                {activeSection === "llm_drift" ? "LLM Drift Monitoring" : "Driftium Monitoring Dashboard"}
              </h1>
              <p>
                {activeSection === "llm_drift"
                  ? "Monitor semantic drift in LLM responses using embeddings, centroid distance, and MMD scoring."
                  : sourceLabel}
              </p>
            </div>
            <div className="lastUpdate">
              <span>Last Update</span>
              <strong>{lastUpdate}</strong>
            </div>
          </header>


          {error && (
            <div className="apiNotice">
              <AlertTriangle size={18} />
              Could not load monitoring data: {error}
            </div>
          )}

          {loading && !error && (
            <div className="apiNotice live">
              <Loader2 size={18} />
              Refreshing production telemetry
            </div>
          )}

          {!hasData && !loading && !error && !activeSection.startsWith("llm_") && activeSection !== "settings" && (
            <EmptyMonitoringPanel mode={mode} />
          )}

          {activeSection === "llm_drift" && (
            <LlmDriftPanel />
          )}

          {activeSection === "llm_playground" && (
            <LlmPlaygroundPanel />
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

function EmptyMonitoringPanel({ mode }) {
  return (
    <section className="dashboardPanel promptPanel">
      <div className="promptHeader">
        <div>
          <span>Monitoring Data</span>
          <p>
            {mode === "upload"
              ? "Choose a CSV batch in Settings to request a live drift report."
              : "Start the FastAPI backend or refresh the analysis to load a live drift report."}
          </p>
        </div>
        <strong>No payload</strong>
      </div>
    </section>
  );
}

function OverviewPanel({ data, driftScore, summary, topSignal, rows, live, onSelectFeature }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardGrid topMetrics">
        <DriftScoreCard driftScore={driftScore} summary={summary} />
        <TrendCard driftScore={driftScore} />
      </section>

      <MonitoringPayloadPanel data={data} topSignal={topSignal} live={live} />

      <section className="miniMetricGrid">
        <MetricTile icon={Database} label="Reference Rows" value={formatInteger(summary.reference_rows)} />
        <MetricTile icon={Activity} label="Incoming Rows" value={formatInteger(summary.incoming_rows)} />
        <MetricTile
          icon={AlertTriangle}
          label="Drift Rate"
          value={formatFractionPercent(summary.drift_rate, 1)}
          tone="danger"
        />
        <MetricTile icon={Brain} label="Top Signal" value={topSignal.feature} />
      </section>

      <DriftTable rows={rows.slice(0, 8)} onSelectFeature={onSelectFeature} />
    </div>
  );
}

function DriftScoreCard({ driftScore, summary }) {
  const tone = driftScore < 70 ? "critical" : driftScore < 90 ? "warning" : "stable";

  return (
    <article className="dashboardPanel driftScorePanel">
      <div className="panelHeader">
        <span>Drift Score</span>
        <strong className={`statusLabel ${tone}`}>
          {tone === "stable" ? "Stable" : tone === "warning" ? "Warning" : "Critical"}
        </strong>
      </div>
      <div className="scoreValue">
        <strong>{driftScore}</strong>
        <span>/100</span>
      </div>
      <div className="scoreTrack">
        <span style={{ width: `${driftScore}%` }} />
      </div>
      <p>
        {summary.drifted_feature_count} of {summary.monitored_feature_count} monitored signals
        flagged against baseline.
      </p>
    </article>
  );
}

function TrendCard({ driftScore }) {
  const values = useMemo(() => {
    const delta = driftScore - TREND_VALUES[TREND_VALUES.length - 1];
    return TREND_VALUES.map((value, index) =>
      index === TREND_VALUES.length - 1 ? driftScore : clamp(value + delta * 0.18, 18, 96),
    );
  }, [driftScore]);

  return (
    <article className="dashboardPanel trendPanel">
      <div className="panelHeader">
        <span>30-Day Drift Trend</span>
        <div className="legendDots">
          <span className="driftDot">Drift %</span>
          <span className="thresholdDot">Threshold</span>
        </div>
      </div>
      <LineTrend values={values} />
    </article>
  );
}

function LineTrend({ values }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 1000;
      const y = 170 - ((value - min) / spread) * 112;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="lineTrend" viewBox="0 0 1000 220" role="img" aria-label="30 day drift trend">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#11d8e8" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#11d8e8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[120, 280, 440, 600, 760, 920].map((x) => (
        <line key={x} x1={x} x2={x} y1="34" y2="186" />
      ))}
      <line className="thresholdLine" x1="0" x2="1000" y1="122" y2="122" />
      <polygon points={`0,178 ${points} 1000,178`} fill="url(#trendFill)" />
      <polyline points={points} />
    </svg>
  );
}

function MonitoringPayloadPanel({ data, topSignal, live }) {
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
    <section className="dashboardPanel comparisonPanel">
      <div className="comparisonTitle">
        <div>
          <Zap size={28} />
          <h2>Monitoring Payload</h2>
        </div>
        <span>{live ? "Live API" : "Waiting"}</span>
      </div>
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
    </section>
  );
}

function CodePane({ title, badge, code, muted = false }) {
  return (
    <article className="codePane">
      <div className="codeHeader">
        <span className={muted ? "mutedDot" : ""}>{title}</span>
        {badge && <strong>{badge}</strong>}
      </div>
      <pre>{code}</pre>
    </article>
  );
}

function RcaPanel({ data, feature }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setResult(null);
    setError("");
  }, [data?.generated_at, feature]);

  async function requestRca() {
    if (!data || !feature) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      setResult(await generateRca({ data, feature }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboardPanel promptPanel">
      <div className="promptHeader">
        <div>
          <span>Root Cause Analysis</span>
          <p>Generate a grounded explanation for the selected drift signal.</p>
        </div>
        <strong>{feature ?? "No feature"}</strong>
      </div>

      <div className="promptActions">
        {error && <span>{error}</span>}
        {!error && result?.available && <span>{result.content}</span>}
        {!error && result && !result.available && (
          <span>
            {result.message}
            {result.error ? ` Details: ${result.error}` : ""}
          </span>
        )}
        <button
          className="cyanButton"
          type="button"
          onClick={requestRca}
          disabled={!data || !feature || loading}
        >
          {loading ? <SpinnerLabel label="Generating" /> : <Brain size={18} />}
          {!loading && "Generate RCA"}
        </button>
      </div>
    </section>
  );
}

function MetricTile({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <article className={`metricTile ${tone}`}>
      <Icon size={21} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DriftAnalysisPanel({
  data,
  rows,
  topSignal,
  summary,
  activeFeature,
  featureDetails,
  onSelectFeature,
}) {
  return (
    <div className="dashboardStack">
      <section className="dashboardPanel analysisHero">
        <div>
          <span>Drift Analysis</span>
          <h2>{activeFeature ?? topSignal.feature}</h2>
          <p>
            Highest observed movement from {summary.monitored_feature_count} monitored signals.
            Current top score: {formatDecimal(topSignal.drift_score, 2)}.
          </p>
        </div>
        <VectorCube />
      </section>
      <section className="dashboardGrid analysisGrid">
        <SignalBars rows={rows} onSelectFeature={onSelectFeature} />
        <DriftTable
          rows={rows}
          selectedFeature={activeFeature}
          onSelectFeature={onSelectFeature}
        />
      </section>
      <FeatureDetailsPanel featureDetails={featureDetails} />
      <RcaPanel data={data} feature={activeFeature ?? topSignal.feature} />
    </div>
  );
}

function FeatureDetailsPanel({ featureDetails }) {
  if (!featureDetails) {
    return (
      <section className="dashboardPanel promptPanel">
        <div className="promptHeader">
          <div>
            <span>Feature Details</span>
            <p>Select a signal from the monitoring table to inspect its backend details.</p>
          </div>
          <strong>No feature</strong>
        </div>
      </section>
    );
  }

  const metrics = Object.entries(featureDetails.metrics ?? {});
  const chartRows = featureDetails.chart ?? [];
  const labelKey = featureDetails.chart_label ?? "bucket";

  return (
    <section className="dashboardPanel settingsPanel">
      <div className="comparisonTitle">
        <div>
          <Table2 size={28} />
          <h2>{featureDetails.feature}</h2>
        </div>
        <span>{featureDetails.status}</span>
      </div>

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
    </section>
  );
}

function SignalBars({ rows, onSelectFeature }) {
  const maxScore = Math.max(...rows.map((row) => Number(row.drift_score) || 0), 0.01);

  return (
    <article className="dashboardPanel signalPanel">
      <div className="panelHeader">
        <span>Signal Strength</span>
        <strong>Score</strong>
      </div>
      <div className="signalList">
        {rows.map((row) => (
          <button
            className="signalRow"
            key={row.feature}
            type="button"
            onClick={() => onSelectFeature?.(row.feature)}
          >
            <span>{row.feature}</span>
            <div>
              <span style={{ width: `${Math.max((row.drift_score / maxScore) * 100, 4)}%` }} />
            </div>
            <strong>{formatDecimal(row.drift_score, 2)}</strong>
          </button>
        ))}
      </div>
    </article>
  );
}

function DriftTable({ rows, selectedFeature, onSelectFeature }) {
  return (
    <section className="dashboardPanel tablePanel">
      <div className="panelHeader">
        <span>Monitoring Snapshot</span>
        <strong>{rows.length} signals</strong>
      </div>
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
                  <span className={`statePill ${statusClass(row.status)}`}>{row.status}</span>
                </td>
                <td>
                  <span className={`severityPill ${severityClass(row.severity)}`}>
                    {row.severity}
                  </span>
                </td>
                <td>{formatDecimal(row.drift_score, 2)}</td>
                <td>{formatDecimal(row.p_value, 4)}</td>
                <td>{row.shift}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PromptPerformancePanel({ data, topSignal, activeFeature, featureDetails }) {
  return (
    <div className="dashboardStack">
      <MonitoringPayloadPanel data={data} topSignal={topSignal} live />
      <FeatureDetailsPanel featureDetails={featureDetails} />
      <RcaPanel data={data} feature={activeFeature ?? topSignal.feature} />
    </div>
  );
}

function FeatureMixBars({ summary }) {
  const numericCount = Number(summary.numeric_feature_count) || 0;
  const categoricalCount = Number(summary.categorical_feature_count) || 0;
  const total = Math.max(numericCount + categoricalCount, 1);
  const rows = [
    { label: "Numeric", value: numericCount },
    { label: "Categorical", value: categoricalCount },
  ];

  return (
    <div className="signalList">
      {rows.map((row) => (
        <div className="signalRow" key={row.label}>
          <span>{row.label}</span>
          <div>
            <span style={{ width: `${Math.max((row.value / total) * 100, 4)}%` }} />
          </div>
          <strong>{formatInteger(row.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function TokenUsagePanel({ summary }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardGrid tokenGrid">
        <article className="dashboardPanel tokenDetail">
          <div className="panelHeader">
            <span>Feature Type Mix</span>
            <strong>{formatInteger(summary.monitored_feature_count)} signals</strong>
          </div>
          <FeatureMixBars summary={summary} />
        </article>
        <article className="dashboardPanel tokenDetail">
          <div className="panelHeader">
            <span>Monitoring Envelope</span>
            <strong>{formatFractionPercent(summary.drift_rate)}</strong>
          </div>
          <dl>
            <div>
              <dt>Reference rows</dt>
              <dd>{formatInteger(summary.reference_rows)}</dd>
            </div>
            <div>
              <dt>Incoming rows</dt>
              <dd>{formatInteger(summary.incoming_rows)}</dd>
            </div>
            <div>
              <dt>Monitored signals</dt>
              <dd>{formatInteger(summary.monitored_feature_count)}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}

function SettingsPanel({
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
    <section className="dashboardPanel settingsPanel">
      <div className="comparisonTitle">
        <div>
          <SlidersHorizontal size={28} />
          <h2>Monitoring Controls</h2>
        </div>
      </div>

      <div className="settingsGrid">
        <label className="controlCard">
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
        </label>

        <label className={`controlCard ${mode !== "simulated" ? "disabled" : ""}`}>
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
        </label>

        <label className="controlCard">
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
        </label>

        <label className={`uploadControl ${mode !== "upload" ? "disabled" : ""}`}>
          <Upload size={22} />
          <span>{uploadFile?.name || "Choose CSV batch"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={mode !== "upload"}
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <button className="cyanButton" type="button" onClick={reload} disabled={loading}>
        {loading ? <SpinnerLabel label="Refreshing" /> : <RefreshCw size={18} />}
        {!loading && "Refresh Telemetry"}
      </button>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [activeSection, setActiveSection] = useState("llm_drift");
  const [mode, setMode] = useState("simulated");
  const [ageThreshold, setAgeThreshold] = useState(35);
  const [pThreshold, setPThreshold] = useState(0.05);
  const [uploadFile, setUploadFile] = useState(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (screen !== "dashboard") {
      return undefined;
    }

    const controller = new AbortController();

    async function loadMonitoring() {
      if (mode === "upload" && !uploadFile) {
        setData(null);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const payload =
          mode === "upload"
            ? await uploadMonitoringBatch({
                file: uploadFile,
                pThreshold,
                signal: controller.signal,
              })
            : await fetchSimulatedMonitoring({
                ageThreshold,
                pThreshold,
                signal: controller.signal,
              });

        setData(payload);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setData(null);
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMonitoring();

    return () => controller.abort();
  }, [ageThreshold, mode, pThreshold, requestNonce, screen, uploadFile]);

  function enterDashboard() {
    setScreen("dashboard");
    setActiveSection("llm_drift");
  }

  if (screen === "landing") {
    return <LandingPage onEnterDashboard={enterDashboard} />;
  }

  return (
    <DashboardPage
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      data={data}
      error={error}
      loading={loading}
      mode={mode}
      setMode={setMode}
      ageThreshold={ageThreshold}
      setAgeThreshold={setAgeThreshold}
      pThreshold={pThreshold}
      setPThreshold={setPThreshold}
      uploadFile={uploadFile}
      setUploadFile={setUploadFile}
      reload={() => setRequestNonce((current) => current + 1)}
      onLanding={() => setScreen("landing")}
      onDashboard={enterDashboard}
    />
  );
}
