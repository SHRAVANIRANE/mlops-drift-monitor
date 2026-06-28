import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  Brain,
  Zap,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";
import { formatInteger, formatDecimal, formatFractionPercent } from "../../utils/formatters";
import { TREND_VALUES } from "../../constants";

// ─── Utility ─────────────────────────────────────────────────────────────────
function getTone(driftScore) {
  if (driftScore < 70) return "critical";
  if (driftScore < 90) return "warning";
  return "stable";
}

// ─── Circular health score ring ───────────────────────────────────────────────
function HealthRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const tone = getTone(score);
  const strokeColor = tone === "stable" ? "#22c55e" : tone === "warning" ? "#f59e0b" : "#ef4444";

  return (
    <svg className="healthRing" viewBox="0 0 128 128" aria-hidden>
      <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="64" y="60" textAnchor="middle" fill={strokeColor} fontSize="26" fontWeight="900">{score}</text>
      <text x="64" y="76" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10">/100</text>
    </svg>
  );
}

// ─── 30-day timeline bar ──────────────────────────────────────────────────────
const TIMELINE_SEGMENTS = [
  ...Array(18).fill("stable"),
  ...Array(4).fill("warning"),
  ...Array(3).fill("stable"),
  ...Array(4).fill("warning"),
  ...Array(1).fill("critical"),
];

function TimelineBar() {
  return (
    <div className="overviewTimeline">
      <div className="overviewTimelineBar">
        {TIMELINE_SEGMENTS.map((tone, i) => (
          <div key={i} className={`overviewTimelineSegment overviewTimelineSegment--${tone}`} />
        ))}
      </div>
      <div className="overviewTimelineLabels">
        <span>May 26</span>
        <span>Jun 25 (today)</span>
      </div>
    </div>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function MiniSparkline({ values, color = "#f59e0b" }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.001);
  const w = 64;
  const h = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / spread) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg className="kpiSparkline" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Dual-line trend chart ─────────────────────────────────────────────────────
const DRIFT_TREND = [0.22, 0.21, 0.20, 0.22, 0.24, 0.23, 0.36, 0.48, 0.52, 0.50, 0.45, 0.38, 0.32, 0.28, 0.30, 0.32, 0.35, 0.38, 0.40, 0.42, 0.44, 0.46];
const MMD_TREND   = [0.12, 0.11, 0.11, 0.12, 0.14, 0.13, 0.20, 0.28, 0.32, 0.30, 0.26, 0.22, 0.19, 0.17, 0.18, 0.20, 0.22, 0.24, 0.26, 0.28, 0.29, 0.31];

const DATE_LABELS = ["May 27", "Jun 1", "Jun 6", "Jun 11", "Jun 16", "Jun 21"];

function DriftTrendChart({ activePeriod, onPeriodChange }) {
  const W = 1000;
  const H = 220;
  const PAD = { top: 20, right: 60, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const WARN = 0.30;
  const CRIT = 0.60;
  const Y_MAX = 1.0;

  function toCoord(v, i, arr) {
    const x = PAD.left + (i / (arr.length - 1)) * chartW;
    const y = PAD.top + (1 - v / Y_MAX) * chartH;
    return [x, y];
  }

  function makeLine(data) {
    return data.map((v, i) => toCoord(v, i, data).join(",")).join(" ");
  }

  function makeArea(data) {
    const pts = data.map((v, i) => toCoord(v, i, data));
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${first[0]},${PAD.top + chartH} ${pts.map(p => p.join(",")).join(" ")} ${last[0]},${PAD.top + chartH}`;
  }

  const warnY  = PAD.top + (1 - WARN / Y_MAX) * chartH;
  const critY  = PAD.top + (1 - CRIT / Y_MAX) * chartH;
  const yTicks = [0.0, 0.3, 0.5, 0.8, 1.0];

  return (
    <div className="overviewTrendChart">
      <div className="overviewTrendHeader">
        <div className="overviewTrendLegend">
          <span>Drift Score Trend</span>
          <span className="overviewTrendLegendItem overviewTrendLegendItem--drift">— Drift Score</span>
          <span className="overviewTrendLegendItem overviewTrendLegendItem--mmd">— MMD Score</span>
          <span className="overviewTrendLegendItem overviewTrendLegendItem--warn">··· Warn 0.30</span>
          <span className="overviewTrendLegendItem overviewTrendLegendItem--crit">··· Crit 0.60</span>
        </div>
        <div className="overviewTrendTabs">
          {["7d", "14d", "30d"].map((p) => (
            <button
              key={p}
              type="button"
              className={`overviewTrendTab${activePeriod === p ? " active" : ""}`}
              onClick={() => onPeriodChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <svg className="overviewTrendSvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Drift Score Trend">
        <defs>
          <linearGradient id="driftAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mmdAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y = PAD.top + (1 - tick / Y_MAX) * chartH;
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{tick.toFixed(1)}</text>
            </g>
          );
        })}

        {/* Threshold lines */}
        <line x1={PAD.left} x2={W - PAD.right} y1={warnY} y2={warnY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 8" opacity="0.5" />
        <line x1={PAD.left} x2={W - PAD.right} y1={critY} y2={critY} stroke="#ef4444" strokeWidth="1" strokeDasharray="6 8" opacity="0.5" />
        <text x={W - PAD.right + 4} y={warnY + 4} fill="#f59e0b" fontSize="8" opacity="0.8">warn 0.30</text>
        <text x={W - PAD.right + 4} y={critY + 4} fill="#ef4444" fontSize="8" opacity="0.8">crit 0.60</text>

        {/* Area fills */}
        <polygon points={makeArea(DRIFT_TREND)} fill="url(#driftAreaGrad)" />
        <polygon points={makeArea(MMD_TREND)} fill="url(#mmdAreaGrad)" />

        {/* Lines */}
        <polyline points={makeLine(MMD_TREND)} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={makeLine(DRIFT_TREND)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* X-axis date labels */}
        {DATE_LABELS.map((label, i) => {
          const x = PAD.left + (i / (DATE_LABELS.length - 1)) * chartW;
          return (
            <text key={label} x={x} y={H - 6} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">{label}</text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Static RCA data ──────────────────────────────────────────────────────────
const RCA_FINDINGS = {
  primary: "Input distribution shift in user_intent — 27.4% OOD samples in last 24h batch",
  factor:  "v2.4 launch (Jun 19) introduced 3,847 new n-gram patterns absent from baseline",
  signal:  "Embedding cluster 7 centroid distance: +0.31 above Q3 baseline",
};

const RCA_ACTIONS = [
  { num: 1, text: "Refresh baseline dataset with post-launch data", eta: "~2h" },
  { num: 2, text: "Enable adaptive threshold for user_intent", eta: "~15m" },
  { num: 3, text: "Audit cluster 7 embedding pattern anomalies", eta: "~1h" },
];

// ─── Static monitoring status data ────────────────────────────────────────────
const SERVICES = [
  { name: "Ingest Pipeline", status: "live" },
  { name: "Drift Detector",  status: "live" },
  { name: "Baseline Engine", status: "warning" },
  { name: "Alert Routing",   status: "live" },
];

const RECENT_EVENTS = [
  { tone: "critical", text: "Drift score exceeded warning threshold (0.30)", time: "2 min ago" },
  { tone: "warning",  text: "Centroid distance increased to 0.467 in prod cluster", time: "1h 14m ago" },
  { tone: "stable",   text: "Baseline sample comparison completed — 48,293 records", time: "8h ago" },
  { tone: "warning",  text: "MMD score crossed 0.25 — anomaly detection triggered", time: "Jun 22" },
  { tone: "stable",   text: "Critical drift DR-2847 resolved after pipeline rollback", time: "Jun 12" },
];

const ACTIVE_ALERTS = [
  { title: "Centroid Drift > 0.42", sub: "gpt-4-turbo-prod / user_intent", time: "Jun 22, 14:03", tone: "critical" },
  { title: "MMD Score > 0.28",      sub: "Embedding cluster 7 divergence",  time: "Jun 20, 09:17", tone: "warning" },
  { title: "Baseline Staleness",    sub: "Last refresh 91 days ago",        time: "Jun 15, 00:00", tone: "info" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OverviewPanel({ data, driftScore, summary, topSignal, rows, live }) {
  const [activePeriod, setActivePeriod] = useState("30d");
  const tone = getTone(driftScore);

  // KPI sparkline data derived from TREND_VALUES
  const centroidTrend = useMemo(() =>
    TREND_VALUES.map((v) => (100 - v) / 100 * 0.6 + 0.1),
    []
  );
  const mmdTrend = useMemo(() =>
    TREND_VALUES.map((v) => (100 - v) / 100 * 0.35 + 0.05),
    []
  );

  const centroidDrift = topSignal?.drift_score != null
    ? Number(topSignal.drift_score).toFixed(3)
    : "0.467";
  const mmdScore = formatDecimal(summary.drift_rate * 0.8 || 0.321, 3);
  const severity = topSignal?.severity || "Medium";
  const baselineSamples = formatInteger(summary.reference_rows || 48293);
  const driftedCount = summary.drifted_feature_count ?? 0;
  const monitoredCount = summary.monitored_feature_count ?? 0;

  return (
    <div className="overviewV2Stack">

      {/* ── DRIFT HEALTH SCORE ────────────────────────────────────────────── */}
      <Panel as="article" className="overviewHeroCard">
        <div className="overviewHeroLeft">
          <HealthRing score={driftScore} />
          <div className="overviewHeroInfo">
            <div className="overviewHeroLabel">DRIFT HEALTH SCORE</div>
            <div className="overviewHeroScoreRow">
              <span className="overviewHeroScore">{driftScore}</span>
              <span className="overviewHeroChange">
                <TrendingUp size={13} />
                -12.4 pts
              </span>
              <span className="overviewHeroChangeSub">vs 7d ago</span>
              <span className={`overviewHeroStatusBadge overviewHeroStatusBadge--${tone}`}>
                {tone === "warning" ? "WARNING — DEGRADING" : tone === "critical" ? "CRITICAL" : "STABLE"}
              </span>
            </div>
            <div className="overviewHeroMeta">
              <span><Clock size={12} /> Updated just now</span>
              {driftedCount > 0 && (
                <span className="overviewHeroMetaDanger">
                  <AlertTriangle size={12} /> {driftedCount} critical · 1 warning active
                </span>
              )}
              <span>Model: <strong>gpt-4-turbo-prod</strong></span>
              <span>Baseline: <strong>Q3-2024-cohort</strong></span>
            </div>
            <div className="overviewHeroTimelineLabel">30-DAY HEALTH TIMELINE</div>
            <TimelineBar />
          </div>
        </div>

        <div className={`overviewHeroAlert overviewHeroAlert--${tone}`}>
          <AlertTriangle size={14} />
          <div>
            <div className="overviewHeroAlertTitle">Warning threshold crossed</div>
            <div className="overviewHeroAlertSub">3 consecutive crossings since Jun 22</div>
            <button type="button" className="overviewHeroAlertLink">
              View incident DR-2849 <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </Panel>

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div className="overviewKpiGrid">
        {/* Centroid Drift */}
        <article className="overviewKpiCard">
          <div className="overviewKpiHeader">
            <span className="overviewKpiLabel">CENTROID DRIFT</span>
            <span className="overviewKpiBadge overviewKpiBadge--warning">WARNING</span>
          </div>
          <div className="overviewKpiValue">{centroidDrift}</div>
          <div className="overviewKpiFooter">
            <span className="overviewKpiChange overviewKpiChange--up">↑ 0.224 vs baseline</span>
            <span className="overviewKpiSubLabel">· spatial dist.</span>
            <MiniSparkline values={centroidTrend} color="#f59e0b" />
          </div>
        </article>

        {/* MMD Score */}
        <article className="overviewKpiCard">
          <div className="overviewKpiHeader">
            <span className="overviewKpiLabel">MMD SCORE</span>
            <span className="overviewKpiBadge overviewKpiBadge--warning">WARNING</span>
          </div>
          <div className="overviewKpiValue">{mmdScore}</div>
          <div className="overviewKpiFooter">
            <span className="overviewKpiChange overviewKpiChange--up">↑ 0.187 vs baseline</span>
            <span className="overviewKpiSubLabel">· max mean disc.</span>
            <MiniSparkline values={mmdTrend} color="#f59e0b" />
          </div>
        </article>

        {/* Severity Level */}
        <article className="overviewKpiCard">
          <div className="overviewKpiHeader">
            <span className="overviewKpiLabel">SEVERITY LEVEL</span>
            <span className="overviewKpiBadge overviewKpiBadge--warning">WARNING</span>
          </div>
          <div className="overviewKpiValue overviewKpiValue--md">{severity}</div>
          <div className="overviewKpiFooter">
            <span className="overviewKpiSubLabel">
              {driftedCount} crossings · since Jun 22
            </span>
          </div>
        </article>

        {/* Baseline Samples */}
        <article className="overviewKpiCard">
          <div className="overviewKpiHeader">
            <span className="overviewKpiLabel">BASELINE SAMPLES</span>
            <span className="overviewKpiBadge overviewKpiBadge--critical">CRITICAL</span>
          </div>
          <div className="overviewKpiValue">{baselineSamples}</div>
          <div className="overviewKpiFooter">
            <span className="overviewKpiSubLabel">Stale — 91 days · Q3-2024-cohort</span>
          </div>
        </article>
      </div>

      {/* ── DRIFT SCORE TREND CHART ────────────────────────────────────────── */}
      <Panel as="article" className="overviewTrendPanel">
        <DriftTrendChart activePeriod={activePeriod} onPeriodChange={setActivePeriod} />
      </Panel>

      {/* ── BOTTOM ROW: RCA + MONITORING STATUS ───────────────────────────── */}
      <div className="overviewBottomGrid">

        {/* Root Cause Analysis */}
        <Panel as="article" className="overviewRcaCard">
          <div className="overviewRcaHeader">
            <div className="overviewRcaHeaderLeft">
              <Zap size={16} />
              <span>Root Cause Analysis</span>
              <span className="overviewRcaAutoTag">AUTO-DETECTED</span>
            </div>
            <span className="overviewRcaTime">Jun 25, 11:42 UTC</span>
          </div>

          <div className="overviewRcaFindings">
            <div className="overviewRcaSectionLabel">AI AGENT FINDINGS</div>
            <div className="overviewRcaFinding">
              <span className="overviewRcaFindingKey overviewRcaFindingKey--primary">Primary:</span>
              <span>{RCA_FINDINGS.primary}</span>
            </div>
            <div className="overviewRcaFinding">
              <span className="overviewRcaFindingKey overviewRcaFindingKey--factor">Factor:</span>
              <span>{RCA_FINDINGS.factor}</span>
            </div>
            <div className="overviewRcaFinding">
              <span className="overviewRcaFindingKey overviewRcaFindingKey--signal">Signal:</span>
              <span>{RCA_FINDINGS.signal}</span>
            </div>
          </div>

          <div className="overviewRcaActions">
            <div className="overviewRcaSectionLabel">RECOMMENDED ACTIONS</div>
            {RCA_ACTIONS.map((a) => (
              <div key={a.num} className="overviewRcaAction">
                <span className="overviewRcaActionNum">{a.num}</span>
                <span className="overviewRcaActionText">{a.text}</span>
                <span className="overviewRcaActionEta">{a.eta}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Monitoring Status */}
        <Panel as="article" className="overviewStatusCard">
          <div className="overviewStatusHeader">
            <div className="overviewStatusHeaderLeft">
              <Activity size={16} />
              <span>Monitoring Status</span>
            </div>
            <span className="overviewStatusLive">
              <span className="overviewStatusLiveDot" />
              Live
            </span>
          </div>

          {/* Services grid */}
          <div className="overviewServicesGrid">
            {SERVICES.map((s) => (
              <div key={s.name} className="overviewServiceItem">
                <span className={`overviewServiceDot overviewServiceDot--${s.status}`} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>

          {/* Recent Events */}
          <div className="overviewStatusSection">
            <div className="overviewStatusSectionLabel">RECENT EVENTS</div>
            <div className="overviewEventsList">
              {RECENT_EVENTS.map((ev, i) => (
                <div key={i} className="overviewEventItem">
                  <span className={`overviewEventDot overviewEventDot--${ev.tone}`} />
                  <div className="overviewEventBody">
                    <span className="overviewEventText">{ev.text}</span>
                    <span className="overviewEventTime">{ev.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="overviewStatusSection">
            <div className="overviewStatusSectionLabel">ACTIVE ALERTS</div>
            <div className="overviewAlertsList">
              {ACTIVE_ALERTS.map((al, i) => (
                <div key={i} className={`overviewAlertItem overviewAlertItem--${al.tone}`}>
                  <div className="overviewAlertTop">
                    <span className="overviewAlertTitle">{al.title}</span>
                    <span className="overviewAlertTime">{al.time}</span>
                  </div>
                  <div className="overviewAlertSub">{al.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
