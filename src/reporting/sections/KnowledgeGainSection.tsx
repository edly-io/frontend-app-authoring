import { useMemo } from 'react';

import { useAssessmentStats } from '../data/apiHooks';
import messages from '../messages';
import useFormatters from '../useFormatters';
import type { Column } from '../types';
import RequestError from '../components/RequestError';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StatsSection from './StatsSection';
import type { AssessmentSummary, CourseAssessmentRow } from '../data/api';

const KnowledgeGainSection = () => {
  const f = useFormatters();
  const { intl } = f;
  const { data, isPending, isError, error } = useAssessmentStats();

  const summaryColumns = <T extends AssessmentSummary>(): Column<T>[] => [
    {
      Header: intl.formatMessage(messages.colLearners),
      accessor: 'learners',
      Cell: ({ row }) => f.number(row.original.learners),
    },
    {
      Header: intl.formatMessage(messages.colAvgPre),
      accessor: 'avgPrePct',
      Cell: ({ row }) => f.percent(row.original.avgPrePct),
    },
    {
      Header: intl.formatMessage(messages.colAvgPost),
      accessor: 'avgPostPct',
      Cell: ({ row }) => f.percent(row.original.avgPostPct),
    },
    {
      Header: intl.formatMessage(messages.colGain),
      accessor: 'gainPct',
      Cell: ({ row }) => f.gain(row.original.gainPct),
    },
  ];

  const courseColumns: Column<CourseAssessmentRow>[] = useMemo(() => [
    {
      Header: intl.formatMessage(messages.colCourse),
      accessor: 'displayName',
      Cell: ({ row }) => row.original.displayName,
    },
    ...summaryColumns<CourseAssessmentRow>(),
  ], [intl, f]);

  if (isError) {
    return <RequestError error={error} />;
  }
  if (isPending || !data) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="reporting-overview">
      <StatsSection
        help={intl.formatMessage(messages.coursesChartHelp)}
        caveat={intl.formatMessage(messages.coursesChartCaveat)}
        summary={data.courses.totals}
        scopeMessage={messages.chartScope}
        outcome={data.courses.totals}
        outcomeTitle={intl.formatMessage(messages.outcomesPanelTitle)}
        outcomeScope={messages.outcomeScope}
        outcomeEmpty={messages.outcomeNoData}
        outcomeAlt={messages.outcomeAlt}
        tableTitle={intl.formatMessage(messages.coursesTableTitle)}
        rows={data.courses.rows}
        columns={courseColumns}
        emptyMessage={intl.formatMessage(messages.noQualifyingCourses)}
      />
    </div>
  );
};

export default KnowledgeGainSection;
