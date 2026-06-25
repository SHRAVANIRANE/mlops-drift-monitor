import React from "react";
import { Loader2 } from "lucide-react";

export default function SpinnerLabel({ label }) {
  return (
    <span className="spinnerLabel">
      <Loader2 size={16} className="spinner" />
      {label}
    </span>
  );
}
