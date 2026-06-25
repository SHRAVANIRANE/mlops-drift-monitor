import React from "react";
import { Sun, Moon } from "lucide-react";
import { TOP_NAV } from "../../constants";
import Button from "../ui/Button";

export default function TopNav({ onDashboard, onLanding, activeItem = "Models", theme, toggleTheme }) {
  return (
    <header className="topNav">
      <Button variant="brand" type="button" onClick={onLanding}>
        Driftium
      </Button>
      <nav className="navLinks" aria-label="Primary navigation">
        {TOP_NAV.map((item) => (
          <button
            key={item}
            className={item === activeItem ? "active" : ""}
            type="button"
            onClick={item === "Models" ? onDashboard : undefined}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="navActions">
        <Button
          variant="themeToggle"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button variant="signin" type="button">
          Sign In
        </Button>
        <Button variant="cyan" compact type="button" onClick={onDashboard}>
          Get Started
        </Button>
      </div>
    </header>
  );
}
