import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';

import type { AssessmentOutcome, AssessmentSummary } from '../data/api';
import messages from '../messages';
import type { Column } from '../types';
import Panel from '../components/Panel';
import StatsTable from '../components/StatsTable';
import AssessmentChart from '../charts/AssessmentChart';
import OutcomeChart from '../charts/OutcomeChart';

interface StatsSectionProps<T extends object> {
  help: string;
  caveat?: string;
  summary: AssessmentSummary;
  scopeMessage: MessageDescriptor;
  outcome: AssessmentOutcome;
  outcomeTitle: string;
  outcomeScope: MessageDescriptor;
  outcomeEmpty: MessageDescriptor;
  outcomeAlt: MessageDescriptor;
  tableTitle: string;
  rows: T[];
  columns: Column<T>[];
  emptyMessage: string;
}

/**
 * One subject of the dashboard: a heading, the figures, then the chart and the table in panels of their own.
 *
 * Splitting the chart from the table is the point. They answer different questions -- "how big is the gain
 * overall" and "where did it come from" -- and in one card the table reads as a footnote to the chart.
 */
const StatsSection = <T extends object>({
  help,
  caveat,
  summary,
  scopeMessage,
  outcome,
  outcomeTitle,
  outcomeScope,
  outcomeEmpty,
  outcomeAlt,
  tableTitle,
  rows,
  columns,
  emptyMessage,
}: StatsSectionProps<T>) => {
  const intl = useIntl();
  return (
    <section className="reporting-section">
      <header className="reporting-section__header">
        <p className="reporting-section__help">{help}</p>
        {caveat && <p className="reporting-section__caveat">{caveat}</p>}
      </header>
      {rows.length === 0 ? <div className="reporting-panel reporting-empty">{emptyMessage}</div> : (
        <>
          {
            /* The two charts share a row: the comparison and the outcome behind it answer one
              question together. The table needs the full width and gets its own row below. */
          }
          <div className="reporting-charts reporting-charts--pair">
            <Panel title={intl.formatMessage(messages.chartPanelTitle)}>
              <AssessmentChart summary={summary} scopeMessage={scopeMessage} />
            </Panel>
            <Panel title={outcomeTitle}>
              <OutcomeChart
                outcome={outcome}
                scopeMessage={outcomeScope}
                emptyMessage={outcomeEmpty}
                altMessage={outcomeAlt}
              />
            </Panel>
          </div>
          <Panel title={tableTitle}>
            <StatsTable rows={rows} columns={columns} countMessage={messages.totalCourses} />
          </Panel>
        </>
      )}
    </section>
  );
};

export default StatsSection;
