import React from "react";

export default function Button({
  variant = "cyan", // cyan, outline, history, brand, signin, themeToggle, newAnalysis
  compact = false,
  className = "",
  children,
  ...props
}) {
  let btnClass = "";
  if (variant === "cyan") btnClass = compact ? "cyanButton compact" : "cyanButton";
  else if (variant === "outline") btnClass = "outlineButton";
  else if (variant === "history") btnClass = "historyButton";
  else if (variant === "brand") btnClass = "brandButton";
  else if (variant === "signin") btnClass = "signinButton";
  else if (variant === "themeToggle") btnClass = "themeToggle";
  else if (variant === "newAnalysis") btnClass = "newAnalysisButton";

  return (
    <button className={`${btnClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
