import {
  Activity,
  BarChart3,
  Blocks,
  Brain,
  Radio,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

export const TOP_NAV = ["Models", "Integrations", "Alerts", "Docs"];

export const DASHBOARD_SECTIONS = [
  { id: "llm_drift", label: "LLM Drift", icon: Activity },
  { id: "llm_playground", label: "Prompt Playground", icon: SlidersHorizontal },
  { id: "overview", label: "Overview", icon: Blocks },
  { id: "drift", label: "Drift Analysis", icon: BarChart3 },
  { id: "prompts", label: "RCA", icon: Brain },
  { id: "tokens", label: "Feature Mix", icon: Radio },
  { id: "settings", label: "Settings", icon: Settings },
];

export const TREND_VALUES = [46, 43, 52, 38, 58, 60, 49, 72, 78, 68, 86, 89, 75, 72, 66, 69, 84];
export const TOKEN_BARS = [34, 50, 45, 66, 38, 78];

export const EMPTY_SUMMARY = {
  reference_rows: 0,
  incoming_rows: 0,
  monitored_feature_count: 0,
  numeric_feature_count: 0,
  categorical_feature_count: 0,
  drifted_feature_count: 0,
  drift_rate: 0,
};
