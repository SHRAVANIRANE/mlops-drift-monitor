import React, { useState, useEffect } from "react";
import { Loader2, Activity, Database, Zap, Table2, Brain, AlertTriangle, CheckCircle, ChevronRight, TrendingUp, Clock } from "lucide-react";
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
      <div className="llmMonitoringStack">
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
  const severityLabel = drift?.severity || "LOW";

  const trendValues = history.map(item => Math.max(0, Math.min(100, Math.round((1 - item.centroid_score) * 100))));
  const displayTrendValues = (isBaselineEmpty || isCurrentEmpty) ? Array(10).fill(50) : (trendValues.length > 1 ? trendValues : Array(10).fill(healthScore));

  // Health ring calculation
  const healthScoreNum = typeof healthScore === "number" ? healthScore : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (healthScoreNum / 100) * circumference;

  return (
    <div className="llmMonitoringStack">
      {/* Status Notice */}
      {(isNotInitialized || drift?.status === "waiting_for_baseline" || isCurrentEmpty) && (
        <div className="llmStatusNotice">
          <Activity size={16} />
          <span>
            {isNotInitialized && <><strong>LLM Monitoring Ready.</strong> No baseline established yet. Generate responses and set a baseline.</>}
            {drift?.status === "waiting_for_baseline" && <><strong>Waiting for baseline creation.</strong></>}
            {isCurrentEmpty && !isNotInitialized && drift?.status !== "waiting_for_baseline" && <><strong>Waiting for comparison samples.</strong></>}
          </span>
        </div>
      )}

      {/* Hero Health Card */}
      <Panel className="llmHeroCard">
        <div className="llmHeroLeft">
          {/* Health Ring */}
          <div className="llmHealthRing">
            <svg viewBox="0 0 120 120" className="llmHealthRingSvg">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={tone === "critical" ? "#ef4444" : tone === "warning" ? "#f59e0b" : "#22c55e"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="llmHealthRingProgress"
              />
            </svg>
            <div className="llmHealthRingValue">
              <strong>{healthScore}</strong>
              {healthScore !== "--" && <span>/100</span>}
            </div>
          </div>

          {/* Hero Info */}
          <div className="llmHeroInfo">
            <span className="llmHeroLabel">LLM Semantic Health</span>
            <div className="llmHeroScoreRow">
              <span className={`llmHeroStatusBadge llmHeroStatusBadge--${tone}`}>
                {tone === "critical" && <AlertTriangle size={12} />}
                {tone === "warning" && <AlertTriangle size={12} />}
                {tone === "stable" && <CheckCircle size={12} />}
                {(isBaselineEmpty || isCurrentEmpty) ? "--" : severityLabel}
              </span>
            </div>
            <div className="llmHeroMeta">
              <span>
                <Activity size={13} />
                Centroid: <strong>{(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.centroid_score, 4)}</strong>
              </span>
              <span>
                <TrendingUp size={13} />
                MMD: <strong>{(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.mmd_score, 4)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Hero Alert */}
        {tone !== "stable" && !(isBaselineEmpty || isCurrentEmpty) && (
          <div className={`llmHeroAlert llmHeroAlert--${tone}`}>
            <AlertTriangle size={18} />
            <div>
              <div className="llmHeroAlertTitle">Semantic Drift Detected</div>
              <div className="llmHeroAlertSub">Response distribution shifted from baseline</div>
            </div>
          </div>
        )}
      </Panel>

      {/* KPI Cards */}
      <section className="llmKpiGrid">
        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Centroid Distance</span>
            <Activity size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue">{(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.centroid_score, 4)}</div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Cosine distance from baseline centroid</span>
          </div>
        </div>

        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">MMD Score</span>
            <TrendingUp size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue">{(isBaselineEmpty || isCurrentEmpty) ? "--" : formatDecimal(drift?.mmd_score, 4)}</div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Distribution-level semantic shift</span>
          </div>
        </div>

        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Baseline Size</span>
            <Database size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue llmKpiValue--md">{samples?.baseline?.length ?? 0}</div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Reference response embeddings</span>
          </div>
        </div>

        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Telemetry Size</span>
            <Zap size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue llmKpiValue--md">{samples?.current?.length ?? 0}</div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Current response embeddings</span>
          </div>
        </div>
      </section>

      {/* Trend Chart */}
      <Panel className="llmTrendPanel">
        <div className="llmTrendHeader">
          <div className="llmTrendTitle">
            <TrendingUp size={16} />
            <span>Semantic Stability Trend</span>
          </div>
          <div className="llmTrendLegend">
            <span className="llmTrendLegendItem llmTrendLegendItem--health">Health %</span>
            <span className="llmTrendLegendItem llmTrendLegendItem--threshold">Critical Limit</span>
          </div>
        </div>
        <div className="llmTrendChart">
          <LineTrend values={displayTrendValues} />
        </div>
      </Panel>

      {/* Empty State or Content */}
      {isBaselineEmpty ? (
        <Panel className="llmEmptyPanel">
          <div className="llmEmptyContent">
            <div className="llmEmptyIcon">
              <Brain size={32} />
            </div>
            <h2>Getting Started with LLM Drift Monitoring</h2>
            <p>
              To monitor semantic drift and response variance, you must first establish a baseline using prompt response telemetry.
            </p>
            <div className="llmEmptySteps">
              <div className="llmEmptyStep">
                <span className="llmEmptyStepNum">1</span>
                <div className="llmEmptyStepContent">
                  <strong>Interact with the Model</strong>
                  <p>Go to the Prompt Playground to generate response distributions for test prompts.</p>
                </div>
              </div>
              <div className="llmEmptyStep">
                <span className="llmEmptyStepNum">2</span>
                <div className="llmEmptyStepContent">
                  <strong>Establish Baseline</strong>
                  <p>Promote the current session responses as your production baseline.</p>
                </div>
              </div>
              <div className="llmEmptyStep">
                <span className="llmEmptyStepNum">3</span>
                <div className="llmEmptyStepContent">
                  <strong>Monitor Drift</strong>
                  <p>Generate new prompts to collect telemetry and view semantic stability and root cause reports in real-time.</p>
                </div>
              </div>
            </div>
            <Button variant="amber" onClick={() => setActiveSection("llm_playground")}>
              <Zap size={16} />
              Open Prompt Playground
            </Button>
          </div>
        </Panel>
      ) : isCurrentEmpty ? (
        <Panel className="llmEmptyPanel">
          <div className="llmEmptyContent">
            <div className="llmEmptyIcon">
              <Activity size={32} />
            </div>
            <h2>Waiting for Telemetry Responses</h2>
            <p>
              Your baseline is established. Now you need to generate telemetry responses to calculate semantic drift and run multi-agent diagnostics.
            </p>
            <div className="llmEmptySteps">
              <div className="llmEmptyStep">
                <span className="llmEmptyStepNum">1</span>
                <div className="llmEmptyStepContent">
                  <strong>Generate Telemetry Responses</strong>
                  <p>Go to the Prompt Playground and type queries on a different topic from the baseline to generate responses.</p>
                </div>
              </div>
              <div className="llmEmptyStep">
                <span className="llmEmptyStepNum">2</span>
                <div className="llmEmptyStepContent">
                  <strong>Monitor Drift & RCA</strong>
                  <p>Return to this dashboard tab to view real-time semantic stability scores and collaborative agent reports.</p>
                </div>
              </div>
            </div>
            <Button variant="amber" onClick={() => setActiveSection("llm_playground")}>
              <Zap size={16} />
              Open Prompt Playground
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          {/* RCA Card */}
          <Panel className="llmRcaPanel">
            <div className="llmRcaHeader">
              <div className="llmRcaHeaderLeft">
                <Brain size={16} />
                <span>Root Cause Analysis</span>
                <span className="llmRcaAutoTag">Auto-Generated</span>
              </div>
              <div className="llmRcaTabs">
                <button
                  type="button"
                  className={`llmRcaTab ${rcaTab === "agentic" ? "active" : ""}`}
                  onClick={() => setRcaTab("agentic")}
                >
                  Multi-Agent RCA
                </button>
                <button
                  type="button"
                  className={`llmRcaTab ${rcaTab === "heuristic" ? "active" : ""}`}
                  onClick={() => setRcaTab("heuristic")}
                >
                  Legacy Summary
                </button>
              </div>
              <Badge variant="label" tone={tone}>
                {rcaTab === "agentic" ? (agenticRca?.metadata?.severity || "Stable") : (rca?.severity || "Stable")}
              </Badge>
            </div>

            {rcaTab === "heuristic" ? (
              <div className="llmRcaContent">
                <div className="llmRcaSection">
                  <span className="llmRcaSectionLabel">Possible Cause</span>
                  <p className="llmRcaText">{rca?.possible_cause || "No cause identified."}</p>
                </div>
                <div className="llmRcaSection">
                  <span className="llmRcaSectionLabel">Summary</span>
                  <p className="llmRcaSubtext">{rca?.summary || "No summary available."}</p>
                </div>
                <div className="llmRcaExamples">
                  <div className="llmRcaExampleCol">
                    <span className="llmRcaSectionLabel">Baseline Examples</span>
                    <ul className="llmRcaList">
                      {rca?.baseline_examples?.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                      {!rca?.baseline_examples?.length && <li>No examples</li>}
                    </ul>
                  </div>
                  <div className="llmRcaExampleCol">
                    <span className="llmRcaSectionLabel">Current Examples</span>
                    <ul className="llmRcaList">
                      {rca?.telemetry_examples?.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                      {!rca?.telemetry_examples?.length && <li>No examples</li>}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="llmRcaContent">
                {/* Triage & Diagnosis Grid */}
                <div className="llmRcaAgentGrid">
                  {/* Triage Agent */}
                  <div className="llmRcaAgentCard">
                    <div className="llmRcaAgentHeader">
                      <span className="llmRcaAgentLabel">Triage Agent Status</span>
                    </div>
                    <div className="llmRcaAgentFields">
                      <div className="llmRcaAgentField">
                        <span className="llmRcaFieldLabel">Severity Class</span>
                        <strong className="llmRcaFieldValue">{agenticRca?.triage?.severity || "LOW"}</strong>
                      </div>
                      <div className="llmRcaAgentField">
                        <span className="llmRcaFieldLabel">Requires Investigation</span>
                        <strong className={`llmRcaFieldValue ${agenticRca?.triage?.requires_investigation ? "llmRcaFieldValue--danger" : "llmRcaFieldValue--success"}`}>
                          {agenticRca?.triage?.requires_investigation ? "YES" : "NO"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis Agent */}
                  <div className="llmRcaAgentCard llmRcaAgentCard--wide">
                    <div className="llmRcaAgentHeader">
                      <span className="llmRcaAgentLabel">Diagnosis Agent Analysis</span>
                      <span className="llmRcaConfidence">
                        Confidence: {Math.round((agenticRca?.diagnosis?.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="llmRcaConfidenceBar">
                      <div
                        className="llmRcaConfidenceFill"
                        style={{ width: `${Math.round((agenticRca?.diagnosis?.confidence || 0) * 100)}%` }}
                      />
                    </div>
                    <div className="llmRcaAgentFields">
                      <div className="llmRcaAgentField">
                        <span className="llmRcaFieldLabel">Root Cause</span>
                        <p className="llmRcaFieldText">{agenticRca?.diagnosis?.root_cause || "No cause diagnosed."}</p>
                      </div>
                      <div className="llmRcaAgentField">
                        <span className="llmRcaFieldLabel">Evidence Cited</span>
                        <p className="llmRcaFieldSubtext">{agenticRca?.diagnosis?.evidence || "No evidence cited."}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="llmRcaRecommendations">
                  <span className="llmRcaSectionLabel">Recommendation Agent Action Items</span>
                  <ul className="llmRcaActionList">
                    {agenticRca?.recommendations?.map((rec, idx) => (
                      <li key={idx} className="llmRcaActionItem">
                        <span className="llmRcaActionNum">{idx + 1}</span>
                        <span className="llmRcaActionText">
                          {typeof rec === 'object' && rec !== null ? (rec.action || rec.recommendation || rec.text || JSON.stringify(rec)) : String(rec)}
                        </span>
                      </li>
                    ))}
                    {!agenticRca?.recommendations?.length && (
                      <li className="llmRcaActionItem llmRcaActionItem--empty">No recommendations available.</li>
                    )}
                  </ul>
                </div>

                {/* Collaboration Log */}
                <div className="llmRcaLog">
                  <div className="llmRcaLogHeader">
                    <span>Agent Collaboration Trace Log</span>
                    <span className="llmRcaLogStatus">ACTIVE RUN</span>
                  </div>
                  <div className="llmRcaLogContent">
                    {agenticRca?.agent_collaboration_log?.map((logLine, idx) => (
                      <div key={idx} className="llmRcaLogLine">
                        <span className="llmRcaLogNum">[{idx + 1}]</span>
                        <span className="llmRcaLogText">{logLine}</span>
                      </div>
                    ))}
                    {!agenticRca?.agent_collaboration_log?.length && (
                      <div className="llmRcaLogLine llmRcaLogLine--empty">No log trace recorded.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* Samples Comparison */}
          <Panel className="llmSamplesPanel">
            <div className="llmSamplesHeader">
              <div className="llmSamplesHeaderLeft">
                <Table2 size={16} />
                <span>Active LLM Samples</span>
              </div>
              <span className="llmSamplesBadge">Side-by-Side</span>
            </div>
            <div className="llmSamplesGrid">
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
