import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Loader2,
  Zap,
  Database,
  Table2,
  AlertTriangle,
  CheckCircle,
  Send,
  Copy,
  RefreshCw,
} from "lucide-react";
import { fetchLlmSamples, generateLlmResponse, setLlmBaseline } from "../../services/api";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import CodePane from "../ui/CodePane";

export default function LlmPlaygroundPanel({ reload }) {
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
      if (reload) reload();
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
      if (reload) reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBaselineSetting(false);
    }
  }

  return (
    <div className="llmMonitoringStack">
      {/* Status Notice */}
      {loading && (
        <div className="llmStatusNotice">
          <Loader2 size={16} className="spinner" />
          <span>Loading playground data...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="apiNotice">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="apiNotice live">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* KPI Cards Row */}
      <section className="llmKpiGrid">
        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Baseline Size</span>
            <Database size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue llmKpiValue--md">
            {loading ? "--" : samples?.baseline?.length ?? 0}
          </div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Reference response embeddings</span>
          </div>
        </div>

        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Telemetry Size</span>
            <Zap size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue llmKpiValue--md">
            {loading ? "--" : samples?.current?.length ?? 0}
          </div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Current session responses</span>
          </div>
        </div>

        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Status</span>
            <RefreshCw size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue llmKpiValue--md" style={{ fontSize: "1.2rem" }}>
            {generating ? "Generating..." : baselineSetting ? "Saving..." : "Ready"}
          </div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">
              {samples?.current?.length > 0 && samples?.baseline?.length > 0
                ? "Can calculate drift"
                : "Generate responses to begin"}
            </span>
          </div>
        </div>

        <div className="llmKpiCard">
          <div className="llmKpiHeader">
            <span className="llmKpiLabel">Model</span>
            <SlidersHorizontal size={14} className="llmKpiIcon" />
          </div>
          <div className="llmKpiValue llmKpiValue--md" style={{ fontSize: "1.2rem" }}>
            smollm:135m
          </div>
          <div className="llmKpiFooter">
            <span className="llmKpiSubLabel">Local Ollama instance</span>
          </div>
        </div>
      </section>

      {/* Prompt Input Panel */}
      <Panel className="llmRcaPanel">
        <div className="llmRcaHeader">
          <div className="llmRcaHeaderLeft">
            <Send size={16} />
            <span>Prompt Input</span>
            <span className="llmRcaAutoTag">Interactive</span>
          </div>
        </div>

        <div className="llmRcaContent">
          <form onSubmit={handleGenerate}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="llmRcaSectionLabel">Enter your prompt below</div>
              <textarea
                className="promptTextarea"
                placeholder="Type a prompt to test the LLM (e.g., 'Explain semantic drift in machine learning')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={generating}
                rows={4}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  background: "var(--code-bg)",
                  color: "var(--color-text-primary)",
                  fontSize: "1rem",
                  lineHeight: "1.6",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setPrompt("")}
                  disabled={generating || !prompt.trim()}
                >
                  Clear
                </Button>
                <Button
                  variant="amber"
                  type="submit"
                  disabled={generating || !prompt.trim()}
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Generate Response
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Panel>

      {/* Last Response Panel */}
      {lastResponse && (
        <Panel className="llmRcaPanel">
          <div className="llmRcaHeader">
            <div className="llmRcaHeaderLeft">
              <Zap size={16} />
              <span>Last Generated Response</span>
              <Badge variant="label" tone="stable">
                New
              </Badge>
            </div>
            <span className="overviewRcaTime">{lastResponse.timestamp || "Just now"}</span>
          </div>

          <div className="llmRcaContent">
            <div className="llmRcaSection">
              <span className="llmRcaSectionLabel">Prompt Submitted</span>
              <p className="llmRcaText">{lastResponse.prompt}</p>
            </div>
            <div className="llmRcaSection" style={{ marginTop: "16px" }}>
              <span className="llmRcaSectionLabel">Model Response</span>
              <div
                style={{
                  marginTop: "8px",
                  padding: "16px",
                  borderRadius: "6px",
                  background: "var(--code-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  fontSize: "0.95rem",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {lastResponse.response}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Baseline Management Panel */}
      <Panel className="llmRcaPanel">
        <div className="llmRcaHeader">
          <div className="llmRcaHeaderLeft">
            <Database size={16} />
            <span>Baseline Management</span>
            <span className="llmRcaAutoTag">Drift Reference</span>
          </div>
        </div>

        <div className="llmRcaContent">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p className="llmRcaSubtext">
              Prompts generated during this session will be captured as the current distribution.
              Click below to promote them as the new drift baseline for semantic monitoring.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="llmRcaSectionLabel" style={{ marginBottom: "8px" }}>
                  Current Telemetry
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "900",
                    color: "var(--amber, #f59e0b)",
                  }}
                >
                  {samples?.current?.length ?? 0}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  responses ready
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="llmRcaSectionLabel" style={{ marginBottom: "8px" }}>
                  Existing Baseline
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "900",
                    color: "#67e8f9",
                  }}
                >
                  {samples?.baseline?.length ?? 0}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  reference samples
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <Button
                variant="outline"
                type="button"
                onClick={handleSetBaseline}
                disabled={baselineSetting || !samples?.current?.length}
              >
                {baselineSetting ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Setting Baseline...
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    Promote to Baseline
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Response Pools Comparison */}
      <Panel className="llmSamplesPanel">
        <div className="llmSamplesHeader">
          <div className="llmSamplesHeaderLeft">
            <Table2 size={16} />
            <span>Response Pools</span>
          </div>
          <span className="llmSamplesBadge">Side-by-Side</span>
        </div>

        {loading ? (
          <div className="apiNotice live" style={{ margin: "20px" }}>
            <Loader2 size={18} className="spinner" />
            Loading response pools...
          </div>
        ) : (
          <div className="llmSamplesGrid">
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
      </Panel>
    </div>
  );
}
