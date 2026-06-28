import React from "react";
import { Activity, AlertTriangle, Search } from "lucide-react";

// Static mini sparkline path data
const SPARKLINE_POINTS = "10,80 40,72 70,74 100,65 130,58 160,56 190,52 220,48 250,45 280,42 310,44 340,40 370,36";

const METRIC_TILES = [
  { label: "CENTROID DRIFT", value: "0.467", tone: "warning", sub: "• warning" },
  { label: "MMD SCORE",      value: "0.321", tone: "warning", sub: "• warning" },
  { label: "SEVERITY",       value: "Medium", tone: "warning", sub: "• warning" },
  { label: "BASELINE",       value: "48,293", tone: "critical", sub: "• critical" },
];

const NAV_ITEMS = ["Overview", "Data Monitoring", "LLM Monitoring", "RCA Reports", "Prompt Playground", "Settings"];

export default function DashboardPreview({ onEnterDashboard }) {
  return (
    <button
      className="dashPreview"
      type="button"
      onClick={onEnterDashboard}
      aria-label="Open Dashboard"
    >
      {/* ── Mini topnav ────────────────────────────────────────────────── */}
      <div className="dashPreviewTopnav">
        <div className="dashPreviewBrand">
          <span className="dashPreviewBrandIcon">
            <Activity size={11} />
          </span>
          <span>Driftium</span>
        </div>
        <div className="dashPreviewSearch">
          <Search size={10} />
          <span>Search models, events, reports…</span>
        </div>
        <div className="dashPreviewBreadcrumb">Acme Corp / Overview</div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="dashPreviewBody">
        {/* Sidebar */}
        <aside className="dashPreviewSidebar">
          <div className="dashPreviewSideLabel">MONITOR</div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item}
              className={`dashPreviewSideItem${item === "Overview" ? " active" : ""}`}
            >
              {item}
            </div>
          ))}
        </aside>

        {/* Main content */}
        <div className="dashPreviewMain">
          {/* Health score row */}
          <div className="dashPreviewHealthRow">
            <div className="dashPreviewScore">
              <div className="dashPreviewScoreRing">
                <span>68</span>
              </div>
              <div className="dashPreviewScoreInfo">
                <div className="dashPreviewScoreHeader">
                  <span className="dashPreviewScoreLabel">DRIFT HEALTH SCORE</span>
                </div>
                <div className="dashPreviewScoreValue">
                  <strong>68</strong>
                  <span className="dashPreviewScoreChange">↓ -12.4 pts</span>
                  <span className="dashPreviewScorePeriod">vs 7d ago</span>
                </div>
                <div className="dashPreviewScoreStatus">⚠ Warning — Degrading</div>
                <div className="dashPreviewProgressBar">
                  <span style={{ width: "68%" }}></span>
                </div>
              </div>
              <div className="dashPreviewWarningBadge">⚠ Warning</div>
            </div>
          </div>

          {/* Metric tiles */}
          <div className="dashPreviewMetrics">
            {METRIC_TILES.map((m) => (
              <div key={m.label} className={`dashPreviewMetricTile dashPreviewMetricTile--${m.tone}`}>
                <div className="dashPreviewMetricLabel">{m.label}</div>
                <div className="dashPreviewMetricValue">{m.value}</div>
                <div className="dashPreviewMetricSub">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Drift trend chart */}
          <div className="dashPreviewChart">
            <div className="dashPreviewChartHeader">
              <span>Drift Score Trend</span>
              <div className="dashPreviewChartTabs">
                <span>7d</span>
                <span>14d</span>
                <span className="active">30d</span>
              </div>
            </div>
            <svg
              className="dashPreviewSparkline"
              viewBox="0 0 380 90"
              preserveAspectRatio="none"
              aria-hidden
            >
              <line x1="10" y1="30" x2="370" y2="30" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" strokeDasharray="4 6" />
              <line x1="10" y1="60" x2="370" y2="60" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
              <polyline
                points={SPARKLINE_POINTS}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="dpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`10,90 ${SPARKLINE_POINTS} 370,90`}
                fill="url(#dpAreaGrad)"
              />
              <text x="10" y="88" fill="rgba(255,255,255,0.3)" fontSize="7">Jun 12</text>
              <text x="120" y="88" fill="rgba(255,255,255,0.3)" fontSize="7">Jun 16</text>
              <text x="230" y="88" fill="rgba(255,255,255,0.3)" fontSize="7">Jun 20</text>
              <text x="330" y="88" fill="rgba(255,255,255,0.3)" fontSize="7">Jun 24</text>
            </svg>
          </div>

          {/* Alert row */}
          <div className="dashPreviewAlert">
            <AlertTriangle size={10} />
            <span>Centroid Drift &gt; 0.42 · gpt-4-turbo-prod / user_intent · Since Jun 22, 14:03 UTC</span>
          </div>
        </div>
      </div>

      {/* ── User badge ─────────────────────────────────────────────────── */}
      <div className="dashPreviewUser">
        <div className="dashPreviewAvatar">A</div>
        <span>Alex Chen</span>
        <span className="dashPreviewUserRole">ML Eng</span>
      </div>
    </button>
  );
}
