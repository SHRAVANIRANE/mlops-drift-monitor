import React from "react";
import FeatureMixBars from "../dashboard/FeatureMixBars";
import { formatInteger, formatFractionPercent } from "../../utils/formatters";
import Panel from "../ui/Panel";
import SectionHeader from "../ui/SectionHeader";

export default function TokenUsagePanel({ summary }) {
  return (
    <div className="dashboardStack">
      <section className="dashboardGrid tokenGrid">
        <Panel as="article" className="tokenDetail">
          <SectionHeader
            variant="panel"
            title="Feature Type Mix"
            actions={<strong>{formatInteger(summary.monitored_feature_count)} signals</strong>}
          />
          <FeatureMixBars summary={summary} />
        </Panel>
        <Panel as="article" className="tokenDetail">
          <SectionHeader
            variant="panel"
            title="Monitoring Envelope"
            actions={<strong>{formatFractionPercent(summary.drift_rate)}</strong>}
          />
          <dl>
            <div>
              <dt>Reference rows</dt>
              <dd>{formatInteger(summary.reference_rows)}</dd>
            </div>
            <div>
              <dt>Incoming rows</dt>
              <dd>{formatInteger(summary.incoming_rows)}</dd>
            </div>
            <div>
              <dt>Monitored signals</dt>
              <dd>{formatInteger(summary.monitored_feature_count)}</dd>
            </div>
          </dl>
        </Panel>
      </section>
    </div>
  );
}
