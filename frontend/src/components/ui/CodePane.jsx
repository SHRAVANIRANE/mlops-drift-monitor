import React from "react";

export default function CodePane({ title, badge, code, muted = false }) {
  return (
    <article className="codePane">
      <div className="codeHeader">
        <span className={muted ? "mutedDot" : ""}>{title}</span>
        {badge && <strong>{badge}</strong>}
      </div>
      <pre>{code}</pre>
    </article>
  );
}
