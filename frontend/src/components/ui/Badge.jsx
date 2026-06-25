import React from "react";

export default function Badge({
  as: Component = "span",
  variant = "pill", // pill, severity, label, signal, badge
  tone = "", // warning, critical, stable, low, medium, high
  className = "",
  children,
  ...props
}) {
  let badgeClass = "";
  if (variant === "pill") {
    badgeClass = `statePill ${tone}`;
  } else if (variant === "severity") {
    badgeClass = `severityPill ${tone}`;
  } else if (variant === "label") {
    badgeClass = `statusLabel ${tone}`;
  } else if (variant === "signal") {
    badgeClass = "signalBadge";
  } else if (variant === "badge") {
    badgeClass = ""; // clean layout for custom badges if needed
  }

  return (
    <Component className={`${badgeClass} ${className}`} {...props}>
      {children}
    </Component>
  );
}
