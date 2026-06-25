const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function fetchSimulatedMonitoring({ ageThreshold, pThreshold, signal }) {
  const params = new URLSearchParams({
    age_threshold: String(ageThreshold),
    p_threshold: String(pThreshold),
  });
  const response = await fetch(`${API_BASE_URL}/api/monitoring/simulated?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function uploadMonitoringBatch({ file, pThreshold, signal }) {
  const params = new URLSearchParams({
    p_threshold: String(pThreshold),
  });

  const response = await fetch(`${API_BASE_URL}/api/monitoring/upload?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "text/csv",
      "X-Filename": file.name,
    },
    body: file,
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function generateRca({ data, feature }) {
  const response = await fetch(`${API_BASE_URL}/api/rca`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feature,
      drift_rows: data.drift_rows,
      incoming_source_description: data.source.description,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function generateLlmResponse(prompt) {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}

export async function setLlmBaseline() {
  const response = await fetch(`${API_BASE_URL}/baseline`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}

export async function fetchLlmDrift() {
  const response = await fetch(`${API_BASE_URL}/drift`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}

export async function fetchLlmDriftHistory() {
  const response = await fetch(`${API_BASE_URL}/drift/history`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}

export async function fetchLlmSamples() {
  const response = await fetch(`${API_BASE_URL}/samples`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}

export async function fetchLlmRca() {
  const response = await fetch(`${API_BASE_URL}/drift/rca`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}

export async function fetchLlmAgenticRca() {
  const response = await fetch(`${API_BASE_URL}/drift/agentic-rca`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json();
}
