import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Loader2, Zap, Database, Table2, AlertTriangle } from "lucide-react";
import { fetchLlmSamples, generateLlmResponse, setLlmBaseline } from "../../services/api";
import CodePane from "../ui/CodePane";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

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
    <div className="dashboardStack">
      <Panel className="settingsPanel">
        <SectionHeader
          variant="comparison"
          title="Interactive LLM Playground"
          icon={SlidersHorizontal}
        />

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
              <Button variant="cyan" compact type="submit" disabled={generating || !prompt.trim()}>
                {generating ? (
                  <span className="spinnerLabel">
                    <Loader2 size={16} className="spinner" />
                  </span>
                ) : (
                  <Zap size={16} />
                )}
                Generate
              </Button>
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
            <Button
              variant="outline"
              type="button"
              onClick={handleSetBaseline}
              disabled={baselineSetting || !samples?.current?.length}
              style={{ marginLeft: "auto" }}
            >
              {baselineSetting ? (
                <span className="spinnerLabel">
                  <Loader2 size={16} className="spinner" />
                </span>
              ) : (
                <Database size={16} />
              )}
              Set Baseline
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="comparisonPanel">
        <SectionHeader
          variant="comparison"
          title="Drift Samples Status"
          badge="Active Pools"
          icon={Table2}
        />
        {loading ? (
          <div className="apiNotice live" style={{ margin: "20px" }}>
            <Loader2 size={18} className="spinner" />
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
      </Panel>
    </div>
  );
}
