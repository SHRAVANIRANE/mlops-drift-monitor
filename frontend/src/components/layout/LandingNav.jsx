import React from "react";
import { Activity, Sun, Moon } from "lucide-react";
import Button from "../ui/Button";

const NAV_LINKS = ["Product", "Docs", "Architecture", "Pricing"];

export default function LandingNav({ onEnterDashboard, theme, toggleTheme }) {
  return (
    <header className="landingNav" role="banner">
      {/* Brand */}
      <button
        className="landingBrand"
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Driftium home"
      >
        <span className="landingBrandIcon">
          <Activity size={16} />
        </span>
        <span className="landingBrandName">Driftium</span>
        <span className="betaBadge">BETA</span>
      </button>

      {/* Nav links */}
      <nav className="landingNavLinks" aria-label="Primary navigation">
        {NAV_LINKS.map((item) => (
          <button
            key={item}
            type="button"
            className="landingNavLink"
            onClick={undefined}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="landingNavActions">
        <Button
          variant="themeToggle"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </Button>
        <button type="button" className="landingSignIn">
          Sign in
        </button>
        <Button variant="amber" compact type="button" onClick={onEnterDashboard} id="nav-launch-dashboard">
          Launch Dashboard
        </Button>
      </div>
    </header>
  );
}
