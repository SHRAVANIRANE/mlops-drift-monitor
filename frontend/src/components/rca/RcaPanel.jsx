import React, { useState, useEffect } from "react";
import {
  Loader2,
  Brain,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  fetchLlmDrift,
  fetchLlmRca,
  fetchLlmAgenticRca,
} from "../../services/api";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import SpinnerLabel from "../ui/SpinnerLabel";

export default function RcaPanel({ data, feature }) {
  const [drift, setDrift] = useState(null);
  const [rca, setRca] = useState(null);
  const [agenticRca, setAgenticRca] = useState(null);
  const [rcaTab, setRcaTab] = useState("agentic");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [driftRes, rcaRes, agenticRcaRes] = await Promise.all([
        fetchLlmDrift(),
        fetchLlmRca(),
        fetchLlmAgenticRca(),
      ]);

      setDrift(driftRes);
      setRca(rcaRes);
      setAgenticRca(agenticRcaRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Calculate tone based on severity
  const tone =
    drift?.severity === "CRITICAL" || drift?.severity === "HIGH"
      ? "critical"
      : drift?.severity === "MEDIUM"
        ? "warning"
        : "stable";

  if (loading) {
    return (
      <div className="apiNotice live">
        <Loader2 size={18} className="spinner" />
        Loading RCA reports...
      </div>
    );
  }

  if (error) {
    const displayError =
      error === "Failed to fetch" ? "Cannot connect to monitoring API." : error;
    return (
      <div className="llmMonitoringStack">
        <div className="apiNotice">
          <AlertTriangle size={18} />
          Failed to load RCA data: {displayError}
        </div>
      </div>
    );
  }

  const isNotInitialized = drift?.status === "not_initialized";
  const isBaselineEmpty =
    drift?.status === "waiting_for_baseline" || isNotInitialized;
  const isCurrentEmpty = drift?.status === "waiting_for_telemetry";

  return (
    <div className="llmMonitoringStack">
      {/* Status Notice */}
      {(isNotInitialized || isBaselineEmpty || isCurrentEmpty) && (
        <div className="llmStatusNotice">
          <Activity size={16} />
          <span>
            {isNotInitialized && (
              <>
                <strong>LLM Monitoring Ready.</strong> No baseline established
                yet. Generate responses and set a baseline to view RCA reports.
              </>
            )}
            {drift?.status === "waiting_for_baseline" && (
              <>
                <strong>Waiting for baseline creation.</strong> Generate
                responses and promote them to baseline.
              </>
            )}
            {isCurrentEmpty &&
              !isNotInitialized &&
              drift?.status !== "waiting_for_baseline" && (
                <>
                  <strong>Waiting for comparison samples.</strong> Generate
                  telemetry responses to view RCA reports.
                </>
              )}
          </span>
        </div>
      )}

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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Badge variant="label" tone={tone}>
              {rcaTab === "agentic"
                ? agenticRca?.metadata?.severity || "Stable"
                : rca?.severity || "Stable"}
            </Badge>
            <Button
              variant="outline"
              compact
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <SpinnerLabel label="Refreshing" />
              ) : (
                <>
                  <RefreshCw size={16} />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {rcaTab === "heuristic" ? (
          <div className="llmRcaContent">
            <div className="llmRcaSection">
              <span className="llmRcaSectionLabel">Possible Cause</span>
              <p className="llmRcaText">
                {rca?.possible_cause || "No cause identified."}
              </p>
            </div>
            <div className="llmRcaSection">
              <span className="llmRcaSectionLabel">Summary</span>
              <p className="llmRcaSubtext">
                {rca?.summary || "No summary available."}
              </p>
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
                    <strong className="llmRcaFieldValue">
                      {agenticRca?.triage?.severity || "LOW"}
                    </strong>
                  </div>
                  <div className="llmRcaAgentField">
                    <span className="llmRcaFieldLabel">
                      Requires Investigation
                    </span>
                    <strong
                      className={`llmRcaFieldValue ${agenticRca?.triage?.requires_investigation ? "llmRcaFieldValue--danger" : "llmRcaFieldValue--success"}`}
                    >
                      {agenticRca?.triage?.requires_investigation ? "YES" : "NO"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Diagnosis Agent */}
              <div className="llmRcaAgentCard llmRcaAgentCard--wide">
                <div className="llmRcaAgentHeader">
                  <span className="llmRcaAgentLabel">
                    Diagnosis Agent Analysis
                  </span>
                  <span className="llmRcaConfidence">
                    Confidence:{" "}
                    {Math.round((agenticRca?.diagnosis?.confidence || 0) * 100)}
                    %
                  </span>
                </div>
                <div className="llmRcaConfidenceBar">
                  <div
                    className="llmRcaConfidenceFill"
                    style={{
                      width: `${Math.round((agenticRca?.diagnosis?.confidence || 0) * 100)}%`,
                    }}
                  />
                </div>
                <div className="llmRcaAgentFields">
                  <div className="llmRcaAgentField">
                    <span className="llmRcaFieldLabel">Root Cause</span>
                    <p className="llmRcaFieldText">
                      {agenticRca?.diagnosis?.root_cause || "No cause diagnosed."}
                    </p>
                  </div>
                  <div className="llmRcaAgentField">
                    <span className="llmRcaFieldLabel">Evidence Cited</span>
                    <p className="llmRcaFieldSubtext">
                      {agenticRca?.diagnosis?.evidence || "No evidence cited."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="llmRcaRecommendations">
              <span className="llmRcaSectionLabel">
                Recommendation Agent Action Items
              </span>
              <ul className="llmRcaActionList">
                {agenticRca?.recommendations?.map((rec, idx) => (
                  <li key={idx} className="llmRcaActionItem">
                    <span className="llmRcaActionNum">{idx + 1}</span>
                    <span className="llmRcaActionText">
                      {typeof rec === "object" && rec !== null
                        ? rec.action ||
                          rec.recommendation ||
                          rec.text ||
                          JSON.stringify(rec)
                        : String(rec)}
                    </span>
                  </li>
                ))}
                {!agenticRca?.recommendations?.length && (
                  <li className="llmRcaActionItem llmRcaActionItem--empty">
                    No recommendations available.
                  </li>
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
                  <div className="llmRcaLogLine llmRcaLogLine--empty">
                    No log trace recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
