import React from "react";
import {
  Activity,
  ArrowRight,
  ExternalLink,
  TrendingDown,
  Clock,
  Database,
  Layers,
  Zap,
  FileText,
  FlaskConical,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import LandingNav from "../components/layout/LandingNav";
import DashboardPreview from "../components/ui/DashboardPreview";

// ─── Stats strip ──────────────────────────────────────────────────────────────
const HERO_STATS = [
  { value: "8+", label: "Features Monitored" },
  { value: "<100ms", label: "Detection Latency" },
  { value: "Multi-Agent", label: "Root Cause Analysis" },
  { value: "ML + LLM", label: "Unified Platform" },
];

// ─── Problem cards ────────────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: TrendingDown,
    title: "Feature Drift",
    body: "Production data distributions shift over time, silently degrading model performance without any infrastructure failure.",
    accent: "danger",
  },
  {
    icon: Activity,
    title: "Semantic Drift",
    body: "LLM outputs gradually diverge from expected behavior as input patterns evolve after deployment.",
    accent: "warning",
  },
  {
    icon: Clock,
    title: "Delayed Detection",
    body: "Traditional APM tools monitor latency and errors — they cannot detect AI-specific quality degradation until it is already impacting users.",
    accent: "muted",
  },
];

// ─── Platform capabilities ────────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: BarChart3,
    title: "Feature Drift Detection",
    items: ["KS Test", "Chi-Square", "PSI", "Severity Analysis", "Population Shift"],
  },
  {
    icon: Activity,
    title: "LLM Observability",
    items: ["Embedding Monitoring", "Centroid Drift", "MMD Detection", "Semantic Similarity"],
  },
  {
    icon: Zap,
    title: "Agentic RCA",
    items: ["Triage Agent", "Diagnosis Agent", "Recommendation Agent", "Auto-generated Reports"],
  },
  {
    icon: FlaskConical,
    title: "Prompt Playground",
    items: ["Baseline Creation", "Prompt Testing", "Response Analysis", "Drift Scoring"],
  },
];

// ─── Pipeline steps ───────────────────────────────────────────────────────────
const PIPELINE = [
  {
    step: "01",
    icon: Database,
    title: "Production Data",
    tags: ["Kafka", "S3", "Snowflake"],
  },
  {
    step: "02",
    icon: Activity,
    title: "Drift Detection Engine",
    tags: ["KS Test", "PSI", "MMD"],
  },
  {
    step: "03",
    icon: Layers,
    title: "Vector Database",
    tags: ["Embeddings", "Centroids", "Index"],
  },
  {
    step: "04",
    icon: Zap,
    title: "Multi-Agent RCA",
    tags: ["Triage", "Diagnosis", "Actions"],
  },
  {
    step: "05",
    icon: LayoutDashboard,
    title: "Observability Dashboard",
    tags: ["Alerts", "Reports", "Playground"],
  },
];

// ─── Why Driftium ─────────────────────────────────────────────────────────────
const WHY_DRIFTIUM = [
  {
    icon: Clock,
    title: "Detect Drift Early",
    body: "Catch distribution shift, centroid drift, and semantic degradation before it reaches end users. Statistical tests run on every batch.",
  },
  {
    icon: FileText,
    title: "Explain Root Causes",
    body: "Our multi-agent RCA system automatically triages incidents, identifies causal features, and generates a ranked list of remediation actions.",
  },
  {
    icon: Layers,
    title: "Monitor ML + LLM Systems Together",
    body: "A single platform for classical ML features and generative AI outputs. One dashboard, one alert system, one baseline framework.",
  },
];

// ─── Footer links ─────────────────────────────────────────────────────────────
const FOOTER_LINKS = {
  PRODUCT: ["Overview", "Data Monitoring", "LLM Monitoring", "RCA Reports", "Prompt Playground"],
  RESOURCES: ["Documentation", "API Reference", "Architecture", "Changelog"],
  COMPANY: ["About", "Blog", "Careers", "GitHub"],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage({ onEnterDashboard, theme, toggleTheme }) {
  return (
    <div className="marketingPage landingV2">
      <LandingNav onEnterDashboard={onEnterDashboard} theme={theme} toggleTheme={toggleTheme} />

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="heroV2 dotMatrix" aria-label="Hero">
          <div className="heroV2Inner">
            {/* Left column */}
            <div className="heroV2Left">
              <Badge variant="signal" className="heroBadge">
                <Activity size={13} />
                AI Observability Platform
              </Badge>

              <h1 className="heroV2Heading">
                Observe Drift<br />
                <span className="heroAccentText">Before It</span><br />
                Becomes Failure
              </h1>

              <p className="heroV2Sub">
                Monitor feature drift, semantic drift, prompt degradation, and model health across
                production AI systems — with automated root cause analysis.
              </p>

              <div className="heroV2Actions">
                <Button variant="amber" type="button" onClick={onEnterDashboard} id="hero-launch-dashboard">
                  <LayoutDashboard size={17} />
                  Launch Dashboard
                </Button>
                <Button variant="outline" type="button" id="hero-view-architecture">
                  View Architecture
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="heroStatsStrip">
                {HERO_STATS.map((s) => (
                  <div key={s.label} className="heroStatItem">
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column – dashboard preview */}
            <div className="heroV2Right">
              <DashboardPreview onEnterDashboard={onEnterDashboard} />
            </div>
          </div>
        </section>

        {/* ── PROBLEM ──────────────────────────────────────────────────────── */}
        <section className="landingSection problemSection" aria-label="The problem">
          <div className="landingInner">
            <div className="sectionLabel">The Problem</div>
            <h2 className="sectionHeading">AI Systems Fail Silently</h2>
            <p className="sectionSub">
              Traditional monitoring tools track uptime and latency. They cannot see the slow
              degradation happening inside your models.
            </p>

            <div className="problemGrid">
              {PROBLEMS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className={`problemCard problemCard--${p.accent}`}>
                    <div className="problemCardIcon">
                      <Icon size={20} />
                    </div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PLATFORM CAPABILITIES ────────────────────────────────────────── */}
        <section className="landingSection capabilitiesSection" aria-label="Platform capabilities">
          <div className="landingInner">
            <div className="sectionLabel">Platform Capabilities</div>
            <h2 className="sectionHeading">Everything Your AI Systems Need</h2>
            <p className="sectionSub">
              From raw feature statistics to LLM embedding analysis to automated root cause reports —
              all in a single observability platform.
            </p>

            <div className="capabilitiesGrid">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="capabilityCard">
                    <div className="capabilityCardHeader">
                      <div className="capabilityIcon">
                        <Icon size={18} />
                      </div>
                      <h3>{cap.title}</h3>
                    </div>
                    <ul className="capabilityList">
                      {cap.items.map((item) => (
                        <li key={item}>
                          <CheckCircle2 size={12} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section className="landingSection pipelineSection" aria-label="How it works">
          <div className="landingInner">
            <div className="sectionLabel">How It Works</div>
            <h2 className="sectionHeading">Built on a Production-Grade Pipeline</h2>
            <p className="sectionSub">
              From raw production data to automated root cause analysis in a single connected system.
            </p>

            <div className="pipelineStrip">
              {PIPELINE.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.step}>
                    <div className="pipelineStep">
                      <div className="pipelineStepTop">
                        <span className="pipelineStepNum">{step.step}</span>
                        <div className="pipelineStepIcon">
                          <Icon size={20} />
                        </div>
                      </div>
                      <h3>{step.title}</h3>
                      <div className="pipelineTags">
                        {step.tags.map((tag) => (
                          <span key={tag} className="pipelineTag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {idx < PIPELINE.length - 1 && (
                      <div className="pipelineArrow" aria-hidden>
                        <ChevronRight size={18} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── WHY DRIFTIUM ─────────────────────────────────────────────────── */}
        <section className="landingSection whySection" aria-label="Why Driftium">
          <div className="landingInner">
            <div className="sectionLabel">Why Driftium</div>
            <h2 className="sectionHeading">Purpose-Built for Production AI</h2>

            <div className="whyGrid">
              {WHY_DRIFTIUM.map((w) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="whyCard">
                    <div className="whyIcon">
                      <Icon size={18} />
                    </div>
                    <h3>{w.title}</h3>
                    <p>{w.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA BAND ─────────────────────────────────────────────────────── */}
        <section className="ctaBandV2" aria-label="Call to action">
          <div className="ctaBandV2Inner">
            <h2>Monitor AI Systems With Confidence</h2>
            <p>
              Built for AI Engineers, ML Teams, and Platform Teams running production systems.
              Detect drift in minutes, not weeks.
            </p>
            <div className="heroV2Actions heroV2ActionsCentered">
              <Button variant="amber" type="button" onClick={onEnterDashboard} id="cta-launch-dashboard">
                <LayoutDashboard size={17} />
                Launch Dashboard
              </Button>
              <Button variant="outline" type="button" id="cta-view-github">
                <ExternalLink size={16} />
                View GitHub
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="siteFooterV2">
        <div className="footerV2Inner">
          <div className="footerBrand">
            <div className="footerBrandLogo">
              <Activity size={18} />
              <strong>Driftium</strong>
            </div>
            <p>MLOps and LLM observability for production AI systems.</p>
          </div>

          <div className="footerLinks">
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group} className="footerLinkGroup">
                <span className="footerGroupLabel">{group}</span>
                <ul>
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" onClick={(e) => e.preventDefault()}>{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footerV2Bottom">
          <span>© 2026 Driftium, Inc. All rights reserved.</span>
          <nav aria-label="Footer legal">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#security">Security</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
