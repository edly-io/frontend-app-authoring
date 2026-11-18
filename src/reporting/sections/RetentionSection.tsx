import { useMemo } from 'react';

import { useAssessmentStats } from '../data/apiHooks';
import messages from '../messages';
import useFormatters from '../useFormatters';
import type { Column } from '../types';
import Panel from '../components/Panel';
import StatsTable from '../components/StatsTable';
import OutcomeChart from '../charts/OutcomeChart';
import type { RetentionRow } from '../data/api';

/**
 * Retention of the single courses that carry a retention check. A separate query result from the same
 * endpoint as the knowledge gain above, so the loading and error states belong to that section; this one
 * renders nothing until the data is there.
 */
const RetentionSection = () => {
  const f = useFormatters();
  const { intl } = f;
  const { data, isPending, isError } = useAssessmentStats();

  const columns: Column<RetentionRow>[] = useMemo(() => [
    {
      Header: intl.formatMessage(messages.colCourse),
      accessor: 'displayName',
      Cell: ({ row }) => row.original.displayName,
    },
    {
      Header: intl.formatMessage(messages.colRetentionLearners),
      accessor: 'assigned',
      Cell: ({ row }) => f.number(row.original.assigned),
    },
    {
      Header: intl.formatMessage(messages.colSat),
      accessor: 'attempted',
      Cell: ({ row }) => f.number(row.original.attempted),
    },
    {
      Header: intl.formatMessage(messages.colRetainedCount),
      accessor: 'passed',
      Cell: ({ row }) => f.number(row.original.passed),
    },
    {
      Header: intl.formatMessage(messages.colRetentionRate),
      accessor: 'passRatePct',
      Cell: ({ row }) => f.percent(row.original.passRatePct),
    },
    {
      Header: intl.formatMessage(messages.colRetentionRules),
      accessor: 'passThresholdPct',
      Cell: ({ row }) =>
        intl.formatMessage(messages.retentionRules, {
          days: row.original.delayDays,
          threshold: row.original.passThresholdPct,
          attempts: row.original.maxAttempts,
        }),
    },
  ], [intl, f]);

  // Absent from a backend that predates the field: render nothing rather than break the page.
  // The knowledge-gain section above shares this request and reports its failures, so a second
  // alert here would only repeat it.
  if (isError || isPending || !data?.retention) {
    return null;
  }

  return (
    <section className="reporting-section">
      <header className="reporting-section__header">
        <p className="reporting-section__help">{intl.formatMessage(messages.retentionHelp)}</p>
      </header>
      {data.retention.rows.length === 0
        ? <div className="reporting-panel reporting-empty">{intl.formatMessage(messages.noRetentionCourses)}</div>
        : (
          <>
            <div className="reporting-charts">
              <Panel title={intl.formatMessage(messages.retentionChartTitle)}>
                <OutcomeChart
                  outcome={data.retention.totals}
                  scopeMessage={messages.retentionScope}
                  emptyMessage={messages.retentionNoData}
                  altMessage={messages.retentionAlt}
                />
              </Panel>
            </div>
            <Panel title={intl.formatMessage(messages.retentionTableTitle)}>
              <StatsTable rows={data.retention.rows} columns={columns} countMessage={messages.totalCourses} />
            </Panel>
          </>
        )}
    </section>
  );
};

export default RetentionSection;
