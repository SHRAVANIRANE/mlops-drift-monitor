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
  History,
  Loader2,
  Play,
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

import { fetchSimulatedMonitoring, uploadMonitoringBatch } from "./api.js";

const TOP_NAV = ["Models", "Integrations", "Alerts", "Docs"];

const DASHBOARD_SECTIONS = [
  { id: "overview", label: "Overview", icon: Blocks },
  { id: "drift", label: "Drift Analysis", icon: BarChart3 },
  { id: "prompts", label: "Prompt Performance", icon: Gauge },
  { id: "tokens", label: "Token Usage", icon: Radio },
  { id: "settings", label: "Settings", icon: Settings },
];

const FALLBACK_ROWS = [
  {
    feature: "semantic_distance",
    type: "numeric",
    status: "alert",
    severity: "Critical",
    drift_score: 0.84,
    p_value: 0.0019,
    shift: "+18.7%",
  },
  {
    feature: "response_toxicity",
    type: "numeric",
    status: "alert",
    severity: "High",
    drift_score: 0.66,
    p_value: 0.0081,
    shift: "+9.4%",
  },
  {
    feature: "latency_ms",
    type: "numeric",
    status: "alert",
    severity: "Medium",
    drift_score: 0.42,
    p_value: 0.032,
    shift: "+6.1%",
  },
  {
    feature: "refusal_rate",
    type: "numeric",
    status: "stable",
    severity: "Low",
    drift_score: 0.18,
    p_value: 0.21,
    shift: "-1.5%",
  },
  {
    feature: "output_schema",
    type: "categorical",
    status: "stable",
    severity: "Low",
    drift_score: 0.12,
    p_value: 0.33,
    shift: "+0.9%",
  },
];

const FALLBACK_MONITORING = {
  generated_at: new Date().toISOString(),
  threshold: 0.05,
  source: {
    label: "Production Snapshot",
    description: "Demo monitoring envelope",
  },
  summary: {
    reference_rows: 2400,
    incoming_rows: 2186,
    monitored_feature_count: 15,
    numeric_feature_count: 10,
    categorical_feature_count: 5,
    drifted_feature_count: 3,
    drift_rate: 0.16,
  },
  top_signal: {
    feature: "semantic_distance",
    test: "embedding delta",
    drift_score: 0.84,
    p_value: 0.0019,
  },
  display_rows: FALLBACK_ROWS,
  drift_rows: FALLBACK_ROWS,
};

const TREND_VALUES = [46, 43, 52, 38, 58, 60, 49, 72, 78, 68, 86, 89, 75, 72, 66, 69, 84];
const TOKEN_BARS = [34, 50, 45, 66, 38, 78];

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
    return "2 mins ago";
  }

  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return "2 mins ago";
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

function getEffectiveData(data) {
  return data ?? FALLBACK_MONITORING;
}

function getRows(data) {
  const rows = data?.display_rows?.length ? data.display_rows : FALLBACK_ROWS;
  return rows.map((row) => ({
    ...row,
    drift_score: Number(row.drift_score) || 0,
  }));
}

function getDriftScore(summary) {
  const rate = clamp(Number(summary?.drift_rate ?? 0.16), 0, 1);
  return clamp(Math.round(100 - rate * 100), 1, 99);
}

function getTopSignal(data) {
  const rows = getRows(data);
  return (
    data?.top_signal ?? {
      feature: rows[0]?.feature ?? FALLBACK_MONITORING.top_signal.feature,
      test: rows[0]?.type ?? FALLBACK_MONITORING.top_signal.test,
      drift_score: rows[0]?.drift_score ?? FALLBACK_MONITORING.top_signal.drift_score,
      p_value: rows[0]?.p_value ?? FALLBACK_MONITORING.top_signal.p_value,
    }
  );
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
          <span>© 2024 Driftium AI. Precision drift monitoring for LLMs.</span>
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
  const effectiveData = getEffectiveData(data);
  const rows = getRows(data);
  const summary = effectiveData.summary;
  const driftScore = getDriftScore(summary);
  const topSignal = getTopSignal(data);
  const lastUpdate = formatLastUpdate(effectiveData.generated_at);

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
            {DASHBOARD_SECTIONS.map((item) => {
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
              <h1>GPT-4o Production Dashboard</h1>
              <p>Monitoring real-time performance and semantic drift</p>
            </div>
            <div className="lastUpdate">
              <span>Last Update</span>
              <strong>{lastUpdate}</strong>
            </div>
          </header>

          {error && (
            <div className="apiNotice">
              <AlertTriangle size={18} />
              Showing a styled local snapshot while the monitoring API is unavailable: {error}
            </div>
          )}

          {loading && !error && (
            <div className="apiNotice live">
              <Loader2 size={18} />
              Refreshing production telemetry
            </div>
          )}

          {activeSection === "overview" && (
            <OverviewPanel
              driftScore={driftScore}
              summary={summary}
              topSignal={topSignal}
              rows={rows}
              live={Boolean(data && !error)}
            />
          )}

          {activeSection === "drift" && (
            <DriftAnalysisPanel rows={rows} topSignal={topSignal} summary={summary} />
          )}

          {activeSection === "prompts" && <PromptPerformancePanel topSignal={topSignal} />}

          {activeSection === "tokens" && <TokenUsagePanel summary={summary} />}

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

function OverviewPanel({ driftScore, summary, topSignal, rows, live }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardGrid topMetrics">
        <DriftScoreCard driftScore={driftScore} summary={summary} />
        <TrendCard driftScore={driftScore} />
      </section>

      <ResponseComparison topSignal={topSignal} />

      <PromptTester topSignal={topSignal} live={live} />

      <section className="miniMetricGrid">
        <MetricTile icon={Database} label="Reference Rows" value={formatInteger(summary.reference_rows)} />
        <MetricTile icon={Activity} label="Incoming Rows" value={formatInteger(summary.incoming_rows)} />
        <MetricTile
          icon={AlertTriangle}
          label="Anomaly Rate"
          value={formatPercentValue(Number(summary.drift_rate || 0.16) * 0.25, 2)}
          tone="danger"
        />
        <MetricTile icon={Brain} label="Top Signal" value={topSignal.feature} />
      </section>

      <DriftTable rows={rows.slice(0, 5)} />
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

function ResponseComparison({ topSignal }) {
  const baseline = `{
  "status": "success",
  "message": "The reference response remains inside approved variance.",
  "feature": "${topSignal.feature}",
  "sentiment": 0.82,
  "tokens": 42
}`;

  const current = `{
  "status": "active",
  "message": "Current output shows measurable semantic movement.",
  "feature": "${topSignal.feature}",
  "drift_score": ${formatDecimal(topSignal.drift_score, 2)},
  "tokens": 48
}`;

  return (
    <section className="dashboardPanel comparisonPanel">
      <div className="comparisonTitle">
        <div>
          <Zap size={28} />
          <h2>Response Comparison</h2>
        </div>
        <span>Snapshot: 2024-10-12_v1</span>
      </div>
      <div className="comparisonGrid">
        <CodePane title="Baseline Response (Reference)" muted code={baseline} />
        <CodePane
          title="Current Live Response"
          badge={`${Math.round(Number(topSignal.drift_score || 0.84) * 100)}% semantic delta`}
          code={current}
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

function PromptTester({ topSignal, live }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");

  function executePrompt() {
    const trimmed = prompt.trim();
    setResult(
      trimmed
        ? `Probe accepted. Driftium will compare this prompt against ${topSignal.feature} and the current ${formatDecimal(
            topSignal.drift_score,
            2,
          )} drift score.`
        : "Add a prompt before executing a consistency test.",
    );
  }

  return (
    <section className="dashboardPanel promptPanel">
      <div className="promptHeader">
        <div>
          <span>Prompt Tester</span>
          <p>Verify model consistency with custom inputs</p>
        </div>
        <strong>{live ? "GPT-4o (Production)" : "GPT-4o (Local Snapshot)"}</strong>
      </div>
      <textarea
        aria-label="Prompt test input"
        placeholder="Type a prompt to test against the baseline..."
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <div className="promptActions">
        {result && <span>{result}</span>}
        <button className="historyButton" type="button">
          <History size={20} />
          History
        </button>
        <button className="cyanButton" type="button" onClick={executePrompt}>
          <Play size={18} />
          Execute Test
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

function DriftAnalysisPanel({ rows, topSignal, summary }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardPanel analysisHero">
        <div>
          <span>Drift Analysis</span>
          <h2>{topSignal.feature}</h2>
          <p>
            Highest observed movement from {summary.monitored_feature_count} monitored model
            signals. Current score: {formatDecimal(topSignal.drift_score, 2)}.
          </p>
        </div>
        <VectorCube />
      </section>
      <section className="dashboardGrid analysisGrid">
        <SignalBars rows={rows} />
        <DriftTable rows={rows} />
      </section>
    </div>
  );
}

function SignalBars({ rows }) {
  const maxScore = Math.max(...rows.map((row) => Number(row.drift_score) || 0), 0.01);

  return (
    <article className="dashboardPanel signalPanel">
      <div className="panelHeader">
        <span>Signal Strength</span>
        <strong>Score</strong>
      </div>
      <div className="signalList">
        {rows.map((row) => (
          <div className="signalRow" key={row.feature}>
            <span>{row.feature}</span>
            <div>
              <span style={{ width: `${Math.max((row.drift_score / maxScore) * 100, 4)}%` }} />
            </div>
            <strong>{formatDecimal(row.drift_score, 2)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function DriftTable({ rows }) {
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
              <tr key={row.feature}>
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

function PromptPerformancePanel({ topSignal }) {
  return (
    <div className="dashboardStack">
      <ResponseComparison topSignal={topSignal} />
      <PromptTester topSignal={topSignal} live />
    </div>
  );
}

function TokenUsagePanel({ summary }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardGrid tokenGrid">
        <article className="dashboardPanel tokenDetail">
          <div className="panelHeader">
            <span>Token Latency</span>
            <strong>Live</strong>
          </div>
          <TokenBars />
        </article>
        <article className="dashboardPanel tokenDetail">
          <div className="panelHeader">
            <span>Usage Envelope</span>
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
  const [activeSection, setActiveSection] = useState("overview");
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
    setActiveSection("overview");
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
