import { useMemo } from 'react';

import { useAssessmentStats } from '../data/apiHooks';
import messages from '../messages';
import useFormatters from '../useFormatters';
import type { Column } from '../types';
import Panel from '../components/Panel';
import RequestError from '../components/RequestError';
import StatsTable from '../components/StatsTable';
import OutcomeChart from '../charts/OutcomeChart';
import LoadingSkeleton from '../components/LoadingSkeleton';
import type { CurriculumRetentionRow } from '../data/api';

/** Retention of the learning paths that carry a 30-day check. Same measure as the course one above. */
const CurriculumRetentionSection = () => {
  const f = useFormatters();
  const { intl } = f;
  const { data, isPending, isError, error } = useAssessmentStats();

  const columns: Column<CurriculumRetentionRow>[] = useMemo(() => [
    {
      Header: intl.formatMessage(messages.colPath),
      accessor: 'title',
      Cell: ({ row }) => row.original.title,
    },
    {
      Header: intl.formatMessage(messages.colCoursesInPath),
      accessor: 'coursesTotal',
      Cell: ({ row }) => f.number(row.original.coursesTotal),
    },
    {
      Header: intl.formatMessage(messages.colRetentionLearners),
      accessor: 'assigned',
      Cell: ({ row }) => f.number(row.original.assigned),
    },
    {
      Header: intl.formatMessage(messages.colCompleted),
      accessor: 'completed',
      Cell: ({ row }) => f.number(row.original.completed),
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

  // Nothing else on this tab reports a failed request, so this section has to.
  if (isError) {
    return <RequestError error={error} />;
  }
  if (isPending) {
    return <LoadingSkeleton />;
  }
  // Absent from a backend that predates the field: render nothing rather than break the page.
  if (!data?.curriculumRetention?.completion) {
    return null;
  }

  return (
    <section className="reporting-section">
      <header className="reporting-section__header">
        <p className="reporting-section__help">{intl.formatMessage(messages.curriculumRetentionHelp)}</p>
      </header>
      {data.curriculumRetention.rows.length === 0
        ? <div className="reporting-panel reporting-empty">{intl.formatMessage(messages.noCurriculumRetention)}</div>
        : (
          <>
            <div className="reporting-charts reporting-charts--pair reporting-charts--even">
              <Panel title={intl.formatMessage(messages.completionChartTitle)}>
                <OutcomeChart
                  outcome={data.curriculumRetention.completion}
                  scopeMessage={messages.completionScope}
                  emptyMessage={messages.completionNoData}
                  altMessage={messages.completionAlt}
                  passedLabel={messages.outcomeCompleted}
                  failedLabel={messages.outcomeInProgress}
                />
              </Panel>
              <Panel title={intl.formatMessage(messages.curriculumRetentionChartTitle)}>
                <OutcomeChart
                  outcome={data.curriculumRetention.totals}
                  scopeMessage={messages.retentionScope}
                  emptyMessage={messages.retentionNoData}
                  altMessage={messages.retentionAlt}
                />
              </Panel>
            </div>
            <Panel title={intl.formatMessage(messages.curriculumRetentionTableTitle)}>
              <StatsTable
                rows={data.curriculumRetention.rows}
                columns={columns}
                countMessage={messages.totalPaths}
              />
            </Panel>
          </>
        )}
    </section>
  );
};

export default CurriculumRetentionSection;
