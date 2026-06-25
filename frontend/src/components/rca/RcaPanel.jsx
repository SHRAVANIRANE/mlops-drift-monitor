import React, { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import { generateRca } from "../../services/api";
import SpinnerLabel from "../ui/SpinnerLabel";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

export default function RcaPanel({ data, feature }) {
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
    <Panel className="promptPanel">
      <SectionHeader
        variant="prompt"
        title="Root Cause Analysis"
        subtitle="Generate a grounded explanation for the selected drift signal."
        badge={feature ?? "No feature"}
      />

      <div className="promptActions">
        {error && <span>{error}</span>}
        {!error && result?.available && <span>{result.content}</span>}
        {!error && result && !result.available && (
          <span>
            {result.message}
            {result.error ? ` Details: ${result.error}` : ""}
          </span>
        )}
        <Button
          variant="cyan"
          type="button"
          onClick={requestRca}
          disabled={!data || !feature || loading}
        >
          {loading ? <SpinnerLabel label="Generating" /> : <Brain size={18} />}
          {!loading && "Generate RCA"}
        </Button>
      </div>
    </Panel>
  );
}
