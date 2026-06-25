import React, { useMemo } from "react";
import { TREND_VALUES } from "../../constants";
import { clamp } from "../../utils/formatters";
import LineTrend from "../charts/LineTrend";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";

export default function TrendCard({ driftScore }) {
  const values = useMemo(() => {
    const delta = driftScore - TREND_VALUES[TREND_VALUES.length - 1];
    return TREND_VALUES.map((value, index) =>
      index === TREND_VALUES.length - 1 ? driftScore : clamp(value + delta * 0.18, 18, 96),
    );
  }, [driftScore]);

  return (
    <Panel as="article" className="trendPanel">
      <SectionHeader
        variant="panel"
        title="30-Day Drift Trend"
        actions={
          <div className="legendDots">
            <span className="driftDot">Drift %</span>
            <span className="thresholdDot">Threshold</span>
          </div>
        }
      />
      <LineTrend values={values} />
    </Panel>
  );
}
