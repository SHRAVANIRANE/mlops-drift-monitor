import React from "react";

export default function SectionHeader({
  variant = "panel", // panel, comparison, prompt, dashboard
  title,
  subtitle,
  actions,
  badge,
  icon: Icon,
  className = "",
  ...props
}) {
  if (variant === "panel") {
    return (
      <div className={`panelHeader ${className}`} {...props}>
        <span>{title}</span>
        {actions}
      </div>
    );
  }

  if (variant === "comparison") {
    return (
      <div className={`comparisonTitle ${className}`} {...props}>
        <div>
          {Icon && <Icon size={28} />}
          <h2>{title}</h2>
        </div>
        {badge && <span>{badge}</span>}
      </div>
    );
  }

  if (variant === "prompt") {
    return (
      <div className={`promptHeader ${className}`} {...props}>
        <div>
          <span>{title}</span>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge && <strong>{badge}</strong>}
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <header className={`dashboardTitleRow ${className}`} {...props}>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </header>
    );
  }

  return null;
}
