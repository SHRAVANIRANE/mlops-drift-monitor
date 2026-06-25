import React from "react";
import {
  Activity,
  ArrowRight,
  Code,
  Table2,
  AlertTriangle,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import TopNav from "../components/layout/TopNav";
import VectorCube from "../components/ui/VectorCube";
import TokenBars from "../components/ui/TokenBars";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function LandingPage({ onEnterDashboard, theme, toggleTheme }) {
  return (
    <div className="marketingPage">
      <TopNav onDashboard={onEnterDashboard} onLanding={() => window.scrollTo(0, 0)} theme={theme} toggleTheme={toggleTheme} />

      <main>
        <section className="marketingHero dotMatrix">
          <div className="heroInner">
            <Badge variant="signal">
              <Activity size={13} />
              Real-time LLM observability
            </Badge>
            <h1>
              <span className="gradientText">Driftium</span>
            </h1>

            <p>
              Driftium tracks semantic drift, output variance, and model decay in real-time. Turn
              black-box AI into transparent, measurable assets.
            </p>
            <div className="heroActions">
              <Button variant="cyan" type="button" onClick={onEnterDashboard}>
                Enter Dashboard
                <ArrowRight size={18} />
              </Button>
              <Button variant="outline" type="button">
                <Code size={17} />
                View Docs
              </Button>
            </div>
          </div>
        </section>

        <section className="featureMosaic" aria-label="Monitoring capabilities">
          <Card variant="feature" className="vectorCard">
            <div className="featureCopy">
              <span className="miniEyebrow">
                <Table2 size={15} />
                Drift Analysis
              </span>
              <h2>Semantic Drift Vectors</h2>
              <p>
                Analyze model output deviations across high-dimensional latent spaces to prevent
                hallucination cycles.
              </p>
            </div>
            <VectorCube />
          </Card>

          <Card variant="feature" className="anomalyCard">
            <AlertTriangle size={22} />
            <h2>Anomalies</h2>
            <p>Instant alerts for production decay.</p>
            <strong>0.04%</strong>
            <span>Critical threshold</span>
          </Card>

          <Card variant="feature" className="latencyCard">
            <Gauge size={22} />
            <span className="livePill">Live</span>
            <div>
              <h2>Token Latency</h2>
              <p>Monitoring global inference speeds.</p>
            </div>
            <TokenBars compact />
          </Card>

          <Card variant="feature" className="safetyCard">
            <div className="shieldTile">
              <ShieldCheck size={38} />
            </div>
            <div>
              <h2>Safety Guardrails</h2>
              <p>
                Integrated policy enforcement for enterprise models. Block toxic outputs before
                they reach the client.
              </p>
              <div className="tagRow">
                <span>PII Redaction</span>
                <span>Bias Control</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="ctaBand">
          <h2>Ready to secure your AI lifecycle?</h2>
          <p>Join 2,000+ ML teams monitoring their production environments with Driftium.</p>
          <div className="heroActions">
            <Button variant="cyan" type="button" onClick={onEnterDashboard}>
              Start Free Trial
            </Button>
            <Button variant="outline" type="button">
              Request Demo
            </Button>
          </div>
        </section>
      </main>

      <footer className="siteFooter">
        <div>
          <strong>Driftium</strong>
          <span>Copyright 2024 Driftium AI. Precision drift monitoring for ML systems.</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#security">Security</a>
          <a href="#status">Status</a>
        </nav>
      </footer>
    </div>
  );
}
