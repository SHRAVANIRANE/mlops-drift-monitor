import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Table2,
  Upload,
} from "lucide-react";

import {
  fetchSimulatedMonitoring,
  generateRca,
  uploadMonitoringBatch,
} from "./api.js";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "features", label: "Feature Analysis", icon: BarChart3 },
  { id: "rca", label: "RCA", icon: Brain },
  { id: "reports", label: "Reports", icon: FileText },
];

const SEVERITIES = ["All", "Critical", "High", "Medium", "Low"];

function formatInteger(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US").format(Number(value));
}

function formatDecimal(value, digits = 3) {
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

function formatPercentValue(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return `${Number(value).toFixed(digits)}%`;
}

function formatDate(value) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function severityClass(severity) {
  return String(severity || "low").toLowerCase();
}

function statusClass(status) {
  return String(status || "stable").toLowerCase();
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function buildCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const columns = Object.keys(rows[0]);
  const header = columns.map(csvEscape).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","));
  return [header, ...body].join("\n");
}

function downloadCsv(rows) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "");

  link.href = url;
  link.download = `drift_report_${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function SpinnerLabel({ label }) {
  return (
    <span className="spinnerLabel">
      <Loader2 size={16} />
      {label}
    </span>
  );
}

function Sidebar({
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
    <aside className="sidebar">
      <div className="brandBlock">
        <div className="brandMark">
          <Activity size={22} />
        </div>
        <div>
          <p className="eyebrow">Driftium</p>
          <h1>Monitoring Console</h1>
        </div>
      </div>

      <div className="controlGroup">
        <div className="controlHeading">
          <SlidersHorizontal size={16} />
          Controls
        </div>

        <div className="segmentedControl" aria-label="Incoming batch source">
          <button
            className={mode === "simulated" ? "selected" : ""}
            type="button"
            onClick={() => setMode("simulated")}
          >
            Simulated
          </button>
          <button
            className={mode === "upload" ? "selected" : ""}
            type="button"
            onClick={() => setMode("upload")}
          >
            Upload
          </button>
        </div>

        <label className={`field ${mode !== "simulated" ? "disabled" : ""}`}>
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

        <label className="field">
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

        <label className={`uploadBox ${mode !== "upload" ? "disabled" : ""}`}>
          <Upload size={18} />
          <span>{uploadFile?.name || "Choose CSV"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={mode !== "upload"}
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button className="primaryAction" type="button" onClick={reload} disabled={loading}>
          {loading ? <SpinnerLabel label="Refreshing" /> : <RefreshCw size={16} />}
          {!loading && <span>Refresh</span>}
        </button>
      </div>
    </aside>
  );
}

function Hero({ data }) {
  const isAlert = data.summary.drifted_feature_count > 0;
  const topSignal = data.top_signal;

  return (
    <section className={`heroBand ${isAlert ? "alert" : "stable"}`}>
      <div>
        <p className="eyebrow">MLOps Monitoring</p>
        <h2>Driftium</h2>
        <p className="heroCopy">
          {data.summary.drifted_feature_count} of {data.summary.monitored_feature_count} monitored
          features are flagged in {data.source.label}.
        </p>
        <div className="chipRow">
          <span>{data.source.label}</span>
          <span>p &lt; {formatDecimal(data.threshold, 3)}</span>
          <span>
            {data.summary.numeric_feature_count} numeric /{" "}
            {data.summary.categorical_feature_count} categorical
          </span>
        </div>
      </div>
      <div className="heroBadge">
        {isAlert ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
        <span>{isAlert ? "Drift Alert" : "Stable Batch"}</span>
        {topSignal && (
          <small>
            {topSignal.feature} - {formatDecimal(topSignal.drift_score, 3)}
          </small>
        )}
      </div>
    </section>
  );
}

function Tabs({ activeTab, setActiveTab }) {
  return (
    <nav className="tabs" aria-label="Monitoring views">
      {TABS.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "selected" : ""}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = "neutral" }) {
  return (
    <div className={`metricCard ${tone}`}>
      <div className="metricIcon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function StatusStrip({ data }) {
  const isAlert = data.summary.drifted_feature_count > 0;
  const topSignal = data.top_signal;

  return (
    <div className={`statusStrip ${isAlert ? "alert" : "stable"}`}>
      <div className="statusIcon">
        {isAlert ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
      </div>
      <div>
        <h3>{isAlert ? "Drift requires attention" : "Current batch is stable"}</h3>
        <p>
          {topSignal
            ? `${topSignal.feature} has the highest signal (${topSignal.test}, score ${formatDecimal(
                topSignal.drift_score,
                3,
              )}, p-value ${formatDecimal(topSignal.p_value, 5)}).`
            : "No feature signal is available for this batch."}
        </p>
      </div>
    </div>
  );
}

function Overview({ data, tableQuery, setTableQuery, severityFilter, setSeverityFilter }) {
  const filteredRows = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();

    return data.display_rows.filter((row) => {
      const matchesQuery =
        !query ||
        row.feature.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query);
      const matchesSeverity = severityFilter === "All" || row.severity === severityFilter;

      return matchesQuery && matchesSeverity;
    });
  }, [data.display_rows, severityFilter, tableQuery]);

  return (
    <div className="viewStack">
      <StatusStrip data={data} />

      <section className="metricGrid">
        <MetricCard
          icon={Database}
          label="Reference rows"
          value={formatInteger(data.summary.reference_rows)}
        />
        <MetricCard
          icon={Database}
          label="Incoming rows"
          value={formatInteger(data.summary.incoming_rows)}
          detail={`${formatInteger(data.summary.incoming_rows - data.summary.reference_rows)} vs ref`}
        />
        <MetricCard
          icon={Gauge}
          label="Monitored features"
          value={formatInteger(data.summary.monitored_feature_count)}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Drifted features"
          value={formatInteger(data.summary.drifted_feature_count)}
          tone={data.summary.drifted_feature_count > 0 ? "warning" : "success"}
        />
        <MetricCard
          icon={Activity}
          label="Drift rate"
          value={formatFractionPercent(data.summary.drift_rate)}
        />
      </section>

      {data.missing_columns.length > 0 && (
        <div className="notice">
          Missing incoming columns: {data.missing_columns.join(", ")}
        </div>
      )}

      <section className="splitGrid">
        <div className="surface">
          <div className="sectionHeading">
            <h3>Top drift signals</h3>
            <span>Score</span>
          </div>
          <TopSignalsChart rows={data.drift_rows.slice(0, 10)} />
        </div>
        <div className="surface wide">
          <div className="sectionHeading">
            <h3>Monitoring snapshot</h3>
            <span>{filteredRows.length} features</span>
          </div>
          <div className="tableToolbar">
            <input
              aria-label="Search features"
              placeholder="Search features"
              value={tableQuery}
              onChange={(event) => setTableQuery(event.target.value)}
            />
            <select
              aria-label="Filter severity"
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </div>
          <SnapshotTable rows={filteredRows} />
        </div>
      </section>
    </div>
  );
}

function TopSignalsChart({ rows }) {
  const maxScore = Math.max(...rows.map((row) => Number(row.drift_score) || 0), 0.01);

  return (
    <div className="signalChart">
      {rows.map((row) => (
        <div className="signalRow" key={row.feature}>
          <div className="signalMeta">
            <strong>{row.feature}</strong>
            <span className={`severityPill ${severityClass(row.severity)}`}>{row.severity}</span>
          </div>
          <div className="barTrack">
            <div
              className={`barFill ${row.drift ? "alert" : "stable"}`}
              style={{ width: `${Math.max((Number(row.drift_score) / maxScore) * 100, 3)}%` }}
            />
          </div>
          <span className="barValue">{formatDecimal(row.drift_score, 3)}</span>
        </div>
      ))}
    </div>
  );
}

function SnapshotTable({ rows }) {
  return (
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
                <span className={`statusPill ${statusClass(row.status)}`}>{row.status}</span>
              </td>
              <td>
                <span className={`severityPill ${severityClass(row.severity)}`}>
                  {row.severity}
                </span>
              </td>
              <td>{row.drift_score}</td>
              <td>{row.p_value}</td>
              <td>{row.shift}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureAnalysis({ data, selectedFeature, setSelectedFeature }) {
  const detail = data.feature_details[selectedFeature];

  if (!detail) {
    return <EmptyState title="No feature selected" />;
  }

  return (
    <div className="viewStack">
      <section className="surface">
        <div className="featureToolbar">
          <div>
            <p className="eyebrow">Feature Analysis</p>
            <h3>{selectedFeature}</h3>
          </div>
          <select
            aria-label="Select feature"
            value={selectedFeature}
            onChange={(event) => setSelectedFeature(event.target.value)}
          >
            {data.monitored_columns.map((feature) => (
              <option key={feature} value={feature}>
                {feature}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="metricGrid featureMetrics">
        {detail.type === "numeric" ? (
          <>
            <MetricCard
              icon={Gauge}
              label="Reference mean"
              value={formatDecimal(detail.metrics.reference_mean, 2)}
            />
            <MetricCard
              icon={Gauge}
              label="Incoming mean"
              value={formatDecimal(detail.metrics.incoming_mean, 2)}
              detail={`${formatDecimal(detail.metrics.mean_delta, 2)} delta`}
            />
            <MetricCard icon={Activity} label="Severity" value={detail.severity} />
            <MetricCard
              icon={BarChart3}
              label="KS stat"
              value={formatDecimal(detail.drift_score, 3)}
            />
          </>
        ) : (
          <>
            <MetricCard icon={Table2} label="Reference top" value={detail.metrics.reference_top} />
            <MetricCard icon={Table2} label="Incoming top" value={detail.metrics.incoming_top} />
            <MetricCard icon={Activity} label="Severity" value={detail.severity} />
            <MetricCard
              icon={BarChart3}
              label="Cramer's V"
              value={formatDecimal(detail.drift_score, 3)}
            />
          </>
        )}
      </section>

      <section className="splitGrid featureGrid">
        <div className="surface wide">
          <div className="sectionHeading">
            <h3>{detail.type === "numeric" ? "Distribution comparison" : "Category mix"}</h3>
            <span>{detail.type}</span>
          </div>
          <GroupedBarChart rows={detail.chart} labelKey={detail.chart_label} />
        </div>
        <FeatureInsight detail={detail} />
      </section>
    </div>
  );
}

function GroupedBarChart({ rows, labelKey }) {
  const maxValue = Math.max(
    ...rows.flatMap((row) => [Number(row.reference) || 0, Number(row.incoming) || 0]),
    0.01,
  );

  return (
    <div className="groupedChart">
      {rows.map((row) => (
        <div className="groupRow" key={row[labelKey]}>
          <span className="groupLabel" title={row[labelKey]}>
            {row[labelKey]}
          </span>
          <div className="groupBars">
            <div className="miniTrack">
              <span
                className="miniBar reference"
                style={{ width: `${Math.max((Number(row.reference) / maxValue) * 100, 2)}%` }}
              />
            </div>
            <div className="miniTrack">
              <span
                className="miniBar incoming"
                style={{ width: `${Math.max((Number(row.incoming) / maxValue) * 100, 2)}%` }}
              />
            </div>
          </div>
          <div className="groupValues">
            <span>{formatDecimal(row.reference, 1)}</span>
            <span>{formatDecimal(row.incoming, 1)}</span>
          </div>
        </div>
      ))}
      <div className="legend">
        <span className="reference">Reference</span>
        <span className="incoming">Incoming</span>
      </div>
    </div>
  );
}

function FeatureInsight({ detail }) {
  const metrics =
    detail.type === "numeric"
      ? [
          ["Status", detail.status],
          ["Severity", detail.severity],
          ["Reference median", formatDecimal(detail.metrics.reference_median, 2)],
          ["Incoming median", formatDecimal(detail.metrics.incoming_median, 2)],
          ["Mean shift", formatPercentValue(detail.metrics.mean_shift_pct)],
        ]
      : [
          ["Status", detail.status],
          ["Severity", detail.severity],
          ["Reference share", formatFractionPercent(detail.metrics.reference_top_share, 1)],
          ["Incoming share", formatFractionPercent(detail.metrics.incoming_top_share, 1)],
          [
            "Unique values",
            `${formatInteger(detail.metrics.reference_unique)} ref / ${formatInteger(
              detail.metrics.incoming_unique,
            )} incoming`,
          ],
        ];

  return (
    <div className="surface insightPanel">
      <div className="sectionHeading">
        <h3>Feature health</h3>
        <span className={`statusPill ${statusClass(detail.status)}`}>{detail.status}</span>
      </div>
      <p>{detail.shift_summary}</p>
      <dl>
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RcaView({ data, selectedFeature, setSelectedFeature }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const detail = data.feature_details[selectedFeature];

  useEffect(() => {
    setResult(null);
    setError("");
  }, [data, selectedFeature]);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      setResult(await generateRca({ data, feature: selectedFeature }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="viewStack">
      <section className="surface">
        <div className="featureToolbar">
          <div>
            <p className="eyebrow">Root Cause Analysis</p>
            <h3>{selectedFeature}</h3>
          </div>
          <select
            aria-label="Select RCA feature"
            value={selectedFeature}
            onChange={(event) => setSelectedFeature(event.target.value)}
          >
            {data.monitored_columns.map((feature) => (
              <option key={feature} value={feature}>
                {feature}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="splitGrid rcaGrid">
        <div className="surface">
          <div className="sectionHeading">
            <h3>RCA context</h3>
            <span className={`severityPill ${severityClass(detail?.severity)}`}>
              {detail?.severity || "n/a"}
            </span>
          </div>
          <dl className="contextList">
            <div>
              <dt>Feature</dt>
              <dd>{selectedFeature}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{detail?.type || "n/a"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{detail?.status || "n/a"}</dd>
            </div>
            <div>
              <dt>Test / p-value</dt>
              <dd>
                {detail?.test || "n/a"} / {formatDecimal(detail?.p_value, 5)}
              </dd>
            </div>
          </dl>
          <button className="primaryAction" type="button" onClick={handleGenerate} disabled={loading}>
            {loading ? <SpinnerLabel label="Generating" /> : <Brain size={16} />}
            {!loading && <span>Generate Explanation</span>}
          </button>
        </div>

        <div className="surface wide">
          <div className="sectionHeading">
            <h3>Explanation</h3>
            <span>{result?.model || "phi3:mini"}</span>
          </div>
          {error && <div className="errorBox">{error}</div>}
          {!error && !result && (
            <EmptyState title="No explanation yet" icon={Brain} compact />
          )}
          {result && result.available && <div className="rcaText">{result.content}</div>}
          {result && !result.available && (
            <div className="errorBox">
              {result.message}
              {result.error && <small>{result.error}</small>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReportsView({ data }) {
  return (
    <div className="viewStack">
      <section className="surface reportHeader">
        <div>
          <p className="eyebrow">Report</p>
          <h3>Drift report</h3>
          <p>
            Generated {formatDate(data.generated_at)} from {data.source.label}.
          </p>
        </div>
        <button className="primaryAction" type="button" onClick={() => downloadCsv(data.drift_rows)}>
          <Download size={16} />
          <span>Download CSV</span>
        </button>
      </section>

      <section className="surface">
        <div className="sectionHeading">
          <h3>Report rows</h3>
          <span>{data.drift_rows.length} features</span>
        </div>
        <SnapshotTable rows={data.display_rows} />
      </section>
    </div>
  );
}

function EmptyState({ title, icon: Icon = Upload, compact = false }) {
  return (
    <div className={`emptyState ${compact ? "compact" : ""}`}>
      <Icon size={compact ? 24 : 34} />
      <h3>{title}</h3>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("simulated");
  const [ageThreshold, setAgeThreshold] = useState(35);
  const [pThreshold, setPThreshold] = useState(0.05);
  const [uploadFile, setUploadFile] = useState(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");

  useEffect(() => {
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
  }, [ageThreshold, mode, pThreshold, requestNonce, uploadFile]);

  useEffect(() => {
    if (!data) {
      setSelectedFeature("");
      return;
    }

    const preferred = data.drifted_features[0] || data.monitored_columns[0] || "";
    if (!selectedFeature || !data.monitored_columns.includes(selectedFeature)) {
      setSelectedFeature(preferred);
    }
  }, [data, selectedFeature]);

  const mainView = () => {
    if (error) {
      return <div className="errorBox mainError">{error}</div>;
    }

    if (!data) {
      return (
        <EmptyState
          title={mode === "upload" ? "Choose a CSV batch" : "Loading monitoring data"}
          icon={mode === "upload" ? Upload : Loader2}
        />
      );
    }

    if (activeTab === "features") {
      return (
        <FeatureAnalysis
          data={data}
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      );
    }

    if (activeTab === "rca") {
      return (
        <RcaView
          data={data}
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      );
    }

    if (activeTab === "reports") {
      return <ReportsView data={data} />;
    }

    return (
      <Overview
        data={data}
        tableQuery={tableQuery}
        setTableQuery={setTableQuery}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
      />
    );
  };

  return (
    <div className="appShell">
      <Sidebar
        mode={mode}
        setMode={setMode}
        ageThreshold={ageThreshold}
        setAgeThreshold={setAgeThreshold}
        pThreshold={pThreshold}
        setPThreshold={setPThreshold}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        reload={() => setRequestNonce((current) => current + 1)}
        loading={loading}
      />

      <main className="mainStage">
        {data && <Hero data={data} />}
        {data && <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />}
        {loading && data && <div className="loadingRibbon">Refreshing monitoring data</div>}
        {mainView()}
      </main>
    </div>
  );
}
