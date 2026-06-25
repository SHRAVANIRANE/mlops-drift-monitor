import React, { useState, useEffect } from "react";
import { Loader2, Activity, Database, Zap, Table2 } from "lucide-react";
import {
  fetchLlmDrift,
  fetchLlmDriftHistory,
  fetchLlmSamples,
  fetchLlmRca,
  fetchLlmAgenticRca,
} from "../../services/api";
import MetricCard from "../ui/MetricCard";
import CodePane from "../ui/CodePane";
import LineTrend from "../charts/LineTrend";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import SectionHeader from "../ui/SectionHeader";
import { formatDecimal, clamp } from "../../utils/formatters";

export default function LlmDriftPanel({ activeSection, requestNonce, setActiveSection }) {
  const [drift, setDrift] = useState(null);
  const [history, setHistory] = useState([]);
  const [samples, setSamples] = useState(null);
  const [rca, setRca] = useState(null);
  const [agenticRca, setAgenticRca] = useState(null);
  const [rcaTab, setRcaTab] = useState("agentic");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const driftRes = await fetchLlmDrift();
        const [historyRes, samplesRes, rcaRes, agenticRcaRes] = await Promise.all([
          fetchLlmDriftHistory(),
          fetchLlmSamples(),
          fetchLlmRca(),
          fetchLlmAgenticRca()
        ]);
        setDrift(driftRes);
        setHistory(historyRes?.history ?? (Array.isArray(historyRes) ? historyRes : []));
        setSamples(samplesRes);
        setRca(rcaRes);
        setAgenticRca(agenticRcaRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeSection, requestNonce]);

  if (loading) {
    return (
      <div className="apiNotice live">
        <Loader2 size={18} className="spinner" />
        Loading LLM observability data...
      </div>
    );
  }

  const isNotInitialized = drift?.status === "not_initialized";
  const isBaselineEmpty = drift?.status === "waiting_for_baseline" || isNotInitialized;
  const isCurrentEmpty = drift?.status === "waiting_for_telemetry";

  if (error) {
    const displayError = error === "Failed to fetch" ? "Cannot connect to monitoring API." : error;
    return (
      <div className="dashboardStack">
        <div className="apiNotice">
          <Loader2 size={18} className="spinner" />
          {`Failed to load LLM monitoring data: ${displayError}`}
        </div>
      </div>
    );
  }

  const centroidVal = drift?.centroid_score ?? 0;
  const healthScore = (isBaselineEmpty || isCurrentEmpty) ? "--" : Math.max(0, Math.min(100, Math.round((1 - centroidVal) * 100)));
  const tone = (isBaselineEmpty || isCurrentEmpty) ? "stable" : (drift?.severity === "CRITICAL" || drift?.severity === "HIGH" ? "critical" : drift?.severity === "MEDIUM" ? "warning" : "stable");

  const trendValues = history.map(item => Math.max(0, Math.min(100, Math.round((1 - item.centroid_score) * 100))));
  const displayTrendValues = (isBaselineEmpty || isCurrentEmpty) ? Array(10).fill(50) : (trendValues.length > 1 ? trendValues : Array(10).fill(healthScore));

  return (
    <div className="dashboardStack">
      {isNotInitialized && (
        <div className="apiNotice live">
          <Activity size={18} />
          <span>
            <strong>LLM Monitoring Ready.</strong> No baseline established yet. Generate responses and set a baseline.
          </span>
        </div>
      )}

      {drift?.status === "waiting_for_baseline" && (
        <div className="apiNotice live">
          <Activity size={18} />
          <span>
            <strong>Waiting for baseline creation.</strong>
          </span>
        </div>
      )}

      {isCurrentEmpty && (
        <div className="apiNotice live">
          <Activity size={18} />
          <span>
            <strong>Waiting for comparison samples.</strong>
          </span>
        </div>
      )}

      <section className="dashboardGrid topMetrics">
        <Panel as="article" className="driftScorePanel">
          <SectionHeader
            variant="panel"
            title="LLM Semantic Health"
            actions={
              <Badge variant="label" tone={tone}>
                {(isBaselineEmpty || isCurrentEmpty) ? "--" : (drift?.severity || "LOW")}
              </Badge>
            }
          />
          <div className="scoreValue">
            <strong>{healthScore}</strong>
            {healthScore !== "--" && <span>/100</span>}
          </div>
          <div className="scoreTrack">
            <span style={{ width: `${healthScore === "--" ? 0 : healthScore}%` }} />
          </div>
          <p>
            Centroid cosine distance: {(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.centroid_score, 4)}. MMD Score: {(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.mmd_score, 4)}.
          </p>
        </Panel>

        <Panel as="article" className="trendPanel">
          <SectionHeader
            variant="panel"
            title="Semantic Stability Trend"
            actions={
              <div className="legendDots">
                <span className="driftDot">Health %</span>
                <span className="thresholdDot">Critical Limit</span>
              </div>
            }
          />
          <LineTrend values={displayTrendValues} />
        </Panel>
      </section>

      <section className="miniMetricGrid">
        <MetricCard icon={Activity} label="Centroid Distance" value={(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.centroid_score, 4)} />
        <MetricCard icon={Table2} label="MMD Score" value={(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.mmd_score, 4)} />
        <MetricCard icon={Database} label="Baseline Size" value={(isBaselineEmpty || isCurrentEmpty) ? (samples?.baseline?.length ?? 0) : (samples?.baseline?.length ?? 0)} />
        <MetricCard icon={Zap} label="Telemetry Size" value={(isBaselineEmpty || isCurrentEmpty) ? (samples?.current?.length ?? 0) : (samples?.current?.length ?? 0)} />
      </section>

      {isBaselineEmpty ? (
        <Panel className="emptyStatePanel">
          <div className="emptyStateContent">
            <h2>Getting Started with LLM Drift Monitoring</h2>
            <p>
              To monitor semantic drift and response variance, you must first establish a baseline using prompt response telemetry.
            </p>
            <div className="emptyStateSteps">
              <div className="stepItem">
                <span className="stepNumber">1</span>
                <div>
                  <strong>Interact with the Model</strong>
                  <p>Go to the Prompt Playground to generate response distributions for test prompts.</p>
                </div>
              </div>
              <div className="stepItem">
                <span className="stepNumber">2</span>
                <div>
                  <strong>Establish Baseline</strong>
                  <p>Promote the current session responses as your production baseline.</p>
                </div>
              </div>
              <div className="stepItem">
                <span className="stepNumber">3</span>
                <div>
                  <strong>Monitor Drift</strong>
                  <p>Generate new prompts to collect telemetry and view semantic stability and root cause reports in real-time.</p>
                </div>
              </div>
            </div>
            <Button
              variant="cyan"
              type="button"
              onClick={() => setActiveSection("llm_playground")}
            >
              <Zap size={18} />
              Open Prompt Playground
            </Button>
          </div>
        </Panel>
      ) : isCurrentEmpty ? (
        <Panel className="emptyStatePanel">
          <div className="emptyStateContent">
            <h2>Waiting for Telemetry Responses</h2>
            <p>
              Your baseline is established. Now you need to generate telemetry responses to calculate semantic drift and run multi-agent diagnostics.
            </p>
            <div className="emptyStateSteps">
              <div className="stepItem">
                <span className="stepNumber">1</span>
                <div>
                  <strong>Generate Telemetry Responses</strong>
                  <p>Go to the Prompt Playground and type queries (e.g. on a different topic from the baseline) to generate responses.</p>
                </div>
              </div>
              <div className="stepItem">
                <span className="stepNumber">2</span>
                <div>
                  <strong>Monitor Drift & RCA</strong>
                  <p>Return to this dashboard tab to view the real-time semantic stability scores and collaborative agent reports.</p>
                </div>
              </div>
            </div>
            <Button
              variant="cyan"
              type="button"
              onClick={() => setActiveSection("llm_playground")}
            >
              <Zap size={18} />
              Open Prompt Playground
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          {/* Root Cause Analysis Card */}
          <Panel className="promptPanel">
            <SectionHeader
              variant="prompt"
              title="Root Cause Analysis"
              subtitle="Explain why the LLM response distribution shifted."
              badge={
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  <div style={{
                    display: "inline-flex",
                    background: "var(--page-deep)",
                    borderRadius: "4px",
                    padding: "3px",
                    border: "1px solid var(--line-soft)"
                  }}>
                    <button
                      type="button"
                      onClick={() => setRcaTab("agentic")}
                      style={{
                        border: 0,
                        background: rcaTab === "agentic" ? "var(--panel-strong)" : "transparent",
                        color: rcaTab === "agentic" ? "var(--cyan-strong)" : "var(--muted)",
                        padding: "6px 12px",
                        borderRadius: "3px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      🤖 Multi-Agent RCA
                    </button>
                    <button
                      type="button"
                      onClick={() => setRcaTab("heuristic")}
                      style={{
                        border: 0,
                        background: rcaTab === "heuristic" ? "var(--panel-strong)" : "transparent",
                        color: rcaTab === "heuristic" ? "var(--cyan-strong)" : "var(--muted)",
                        padding: "6px 12px",
                        borderRadius: "3px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Legacy Summary
                    </button>
                  </div>
                  <Badge variant="label" tone={tone}>
                    {rcaTab === "agentic" ? (agenticRca?.metadata?.severity || "Stable") : (rca?.severity || "Stable")}
                  </Badge>
                </div>
              }
              style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: "15px" }}
            />

            {rcaTab === "heuristic" ? (
              <div style={{ padding: "30px", display: "grid", gap: "20px" }}>
                <div>
                  <strong style={{ display: "block", color: "var(--muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    Possible Cause:
                  </strong>
                  <p style={{ fontSize: "1.1rem", marginTop: "4px", color: "var(--text)" }}>
                    {rca?.possible_cause || "No cause identified."}
                  </p>
                </div>

                <div>
                  <strong style={{ display: "block", color: "var(--muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    Summary:
                  </strong>
                  <p style={{ fontSize: "1rem", marginTop: "4px", color: "var(--muted-strong)" }}>
                    {rca?.summary || "No summary available."}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "10px" }}>
                  <div>
                    <strong style={{ display: "block", color: "var(--muted)", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "8px" }}>
                      Baseline Examples:
                    </strong>
                    <ul style={{ listStyleType: "disc", paddingLeft: "20px", color: "var(--muted-strong)" }}>
                      {rca?.baseline_examples?.map((ex, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>{ex}</li>
                      ))}
                      {!rca?.baseline_examples?.length && <li>No examples</li>}
                    </ul>
                  </div>

                  <div>
                    <strong style={{ display: "block", color: "var(--muted)", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "8px" }}>
                      Current Examples:
                    </strong>
                    <ul style={{ listStyleType: "disc", paddingLeft: "20px", color: "var(--muted-strong)" }}>
                      {rca?.telemetry_examples?.map((ex, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>{ex}</li>
                      ))}
                      {!rca?.telemetry_examples?.length && <li>No examples</li>}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "30px", display: "grid", gap: "24px" }}>
                {/* Agentic Triage & Diagnosis Block */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--line-soft)", borderRadius: "4px", padding: "20px" }}>
                    <div style={{ marginBottom: "15px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Triage Agent Status</span>
                    </div>
                    <div style={{ display: "grid", gap: "12px" }}>
                      <div>
                        <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}>Severity Class:</span>
                        <strong style={{ fontSize: "1rem", color: "var(--text)" }}>{agenticRca?.triage?.severity || "LOW"}</strong>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}>Requires Investigation:</span>
                        <strong style={{
                          fontSize: "1rem",
                          color: agenticRca?.triage?.requires_investigation ? "var(--danger)" : "var(--success)"
                        }}>
                          {agenticRca?.triage?.requires_investigation ? "YES" : "NO"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--line-soft)", borderRadius: "4px", padding: "20px" }}>
                    <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Diagnosis Agent Analysis</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--cyan)", fontWeight: 700 }}>
                        Confidence: {Math.round((agenticRca?.diagnosis?.confidence || 0) * 100)}%
                      </span>
                    </div>
                    {/* Confidence Progress Bar */}
                    <div style={{ width: "100%", height: "6px", background: "var(--line-soft)", borderRadius: "3px", overflow: "hidden", marginBottom: "15px" }}>
                      <div style={{
                        width: `${Math.round((agenticRca?.diagnosis?.confidence || 0) * 100)}%`,
                        height: "100%",
                        background: "var(--cyan)",
                        boxShadow: "0 0 8px var(--cyan)",
                        transition: "width 0.4s ease-out"
                      }} />
                    </div>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <div>
                        <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}>Root Cause:</span>
                        <p style={{ fontSize: "0.95rem", color: "var(--text)", marginTop: "2px" }}>
                          {agenticRca?.diagnosis?.root_cause || "No cause diagnosed."}
                        </p>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}>Evidence Cited:</span>
                        <p style={{ fontSize: "0.9rem", color: "var(--muted-strong)", marginTop: "2px" }}>
                          {agenticRca?.diagnosis?.evidence || "No evidence cited."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendation Agent Actions */}
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--line-soft)", borderRadius: "4px", padding: "20px" }}>
                  <div style={{ marginBottom: "15px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Recommendation Agent Action Items</span>
                  </div>
                  <ul style={{ listStyleType: "none", paddingLeft: 0, margin: 0, display: "grid", gap: "10px" }}>
                    {agenticRca?.recommendations?.map((rec, idx) => (
                      <li key={idx} style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        fontSize: "0.95rem",
                        color: "var(--text)"
                      }}>
                        <span style={{ color: "var(--cyan-strong)", fontWeight: "bold" }}>‣</span>
                        <span>{typeof rec === 'object' && rec !== null ? (rec.action || rec.recommendation || rec.text || JSON.stringify(rec)) : String(rec)}</span>
                      </li>
                    ))}
                    {!agenticRca?.recommendations?.length && (
                      <li style={{ color: "var(--muted)" }}>No recommendations available.</li>
                    )}
                  </ul>
                </div>

                {/* Collaboration Logs Console */}
                <div style={{
                  background: "var(--page-deep)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "4px",
                  padding: "15px 20px",
                  fontFamily: "monospace",
                  fontSize: "0.85rem"
                }}>
                  <div style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: "8px", marginBottom: "10px", color: "var(--muted)", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
                    <span>Agent Collaboration Trace Log</span>
                    <span style={{ color: "var(--cyan-strong)" }}>ACTIVE RUN</span>
                  </div>
                  <div style={{ display: "grid", gap: "8px", color: "var(--muted-strong)" }}>
                    {agenticRca?.agent_collaboration_log?.map((logLine, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "10px" }}>
                        <span style={{ color: "var(--cyan)", userSelect: "none" }}>[{idx + 1}]</span>
                        <span style={{ wordBreak: "break-all" }}>{logLine}</span>
                      </div>
                    ))}
                    {!agenticRca?.agent_collaboration_log?.length && (
                      <div style={{ color: "var(--muted)" }}>No log trace recorded.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel className="comparisonPanel">
            <SectionHeader
              variant="comparison"
              title="Active LLM Samples"
              badge="Side-by-Side"
              icon={Table2}
            />
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
          </Panel>
        </>
      )}
    </div>
  );
}
