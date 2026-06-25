import React, { useEffect, useState } from "react";
import { fetchSimulatedMonitoring, uploadMonitoringBatch } from "./services/api";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("driftium-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("driftium-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  const [screen, setScreen] = useState("landing");
  const [activeSection, setActiveSection] = useState("llm_drift");
  const [mode, setMode] = useState("simulated");
  const [ageThreshold, setAgeThreshold] = useState(35);
  const [pThreshold, setPThreshold] = useState(0.05);
  const [uploadFile, setUploadFile] = useState(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (screen !== "dashboard") {
      return undefined;
    }

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
          setData(null);
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
  }, [ageThreshold, mode, pThreshold, requestNonce, screen, uploadFile]);

  function enterDashboard() {
    setScreen("dashboard");
    setActiveSection("llm_drift");
  }

  if (screen === "landing") {
    return <LandingPage onEnterDashboard={enterDashboard} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <DashboardPage
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      data={data}
      error={error}
      loading={loading}
      mode={mode}
      setMode={setMode}
      ageThreshold={ageThreshold}
      setAgeThreshold={setAgeThreshold}
      pThreshold={pThreshold}
      setPThreshold={setPThreshold}
      uploadFile={uploadFile}
      setUploadFile={setUploadFile}
      reload={() => setRequestNonce((current) => current + 1)}
      requestNonce={requestNonce}
      onLanding={() => setScreen("landing")}
      onDashboard={enterDashboard}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}
