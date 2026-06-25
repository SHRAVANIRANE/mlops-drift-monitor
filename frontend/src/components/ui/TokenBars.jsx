import React from "react";
import { TOKEN_BARS } from "../../constants";

export default function TokenBars({ compact = false }) {
  return (
    <div className={compact ? "tokenBars compact" : "tokenBars"} aria-hidden="true">
      {TOKEN_BARS.map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
