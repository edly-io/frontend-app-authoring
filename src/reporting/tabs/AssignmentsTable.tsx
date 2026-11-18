import { useMemo, useState } from 'react';

import { useCurriculumAssignments } from '../data/apiHooks';
import type { CurriculumAssignmentRow } from '../data/api';
import messages from '../messages';
import useFormatters from '../useFormatters';
import { PAGE_SIZE } from '../types';
import type { Column, TableProps } from '../types';
import ReportTable from '../components/ReportTable';

const AssignmentsTable = ({ curriculumUuid, search, onSearch }: TableProps & { curriculumUuid: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useCurriculumAssignments(curriculumUuid, page, PAGE_SIZE, search);

  const columns: Column<CurriculumAssignmentRow>[] = useMemo(() => [
    {
      Header: intl.formatMessage(messages.colUsername),
      accessor: 'username',
      // Free text of wildly varying length: centring it makes the column look ragged.
      headerClassName: 'reporting-cell--start',
      cellClassName: 'reporting-cell--start',
      Cell: ({ row }) => row.original.username,
    },
    {
      Header: intl.formatMessage(messages.colEmail),
      accessor: 'email',
      headerClassName: 'reporting-cell--start',
      cellClassName: 'reporting-cell--start',
      Cell: ({ row }) => row.original.email,
    },
    { Header: intl.formatMessage(messages.colName), accessor: 'name', Cell: ({ row }) => row.original.name || f.dash },
    {
      Header: intl.formatMessage(messages.colAssigned),
      accessor: 'assignedAt',
      Cell: ({ row }) => f.date(row.original.assignedAt),
    },
    {
      Header: intl.formatMessage(messages.colActive),
      accessor: 'active',
      Cell: ({ row }) => (
        <span className={`reporting-badge reporting-badge--${row.original.active ? 'accent' : 'neutral'}`}>
          {intl.formatMessage(row.original.active ? messages.active : messages.inactive)}
        </span>
      ),
    },
    {
      Header: intl.formatMessage(messages.colCoursesDone),
      accessor: 'coursesCompleted',
      Cell: ({ row }) =>
        intl.formatMessage(messages.coursesOf, {
          completed: f.number(row.original.coursesCompleted),
          total: f.number(row.original.coursesTotal),
        }),
    },
    {
      Header: intl.formatMessage(messages.colComplete),
      accessor: 'completeAt',
      Cell: ({ row }) => f.date(row.original.completeAt),
    },
    {
      // The award date, where there is one, says more than a bare "Awarded".
      Header: intl.formatMessage(messages.colCompleteBadge),
      accessor: 'completeBadgeAwardedAt',
      Cell: ({ row }) => (row.original.completeBadgeAwardedAt
        ? f.date(row.original.completeBadgeAwardedAt)
        : f.badge(row.original.completeBadgeConfigured, false)),
    },
    {
      Header: intl.formatMessage(messages.colKcUnlocks),
      accessor: 'kcUnlocksAt',
      Cell: ({ row }) => f.date(row.original.kcUnlocksAt),
    },
    {
      Header: intl.formatMessage(messages.colKcTaken),
      accessor: 'kcTakenAt',
      Cell: ({ row }) => f.date(row.original.kcTakenAt),
    },
    {
      Header: intl.formatMessage(messages.colKcPassed),
      accessor: 'kcPassed',
      Cell: ({ row }) =>
        f.status(row.original.kcPassed, intl.formatMessage(messages.passed), intl.formatMessage(messages.failed)),
    },
    {
      Header: intl.formatMessage(messages.colRetained),
      accessor: 'retainedAt',
      Cell: ({ row }) => f.date(row.original.retainedAt),
    },
    {
      Header: intl.formatMessage(messages.colRetainedBadge),
      accessor: 'retainedBadgeAwardedAt',
      Cell: ({ row }) => (row.original.retainedBadgeAwardedAt
        ? f.date(row.original.retainedBadgeAwardedAt)
        : f.badge(row.original.retainedBadgeConfigured, false)),
    },
    {
      Header: intl.formatMessage(messages.colLastActivity),
      accessor: 'lastActivity',
      Cell: ({ row }) => f.date(row.original.lastActivity),
    },
  ], [intl, f]);

  return (
    <ReportTable
      columns={columns}
      data={data}
      isPending={isPending}
      isError={isError}
      error={error}
      search={search}
      page={page}
      onSearch={(value) => {
        onSearch(value);
        setPage(1);
      }}
      onPageChange={setPage}
      emptyMessage={intl.formatMessage(messages.emptyAssignments)}
    />
  );
};

export default AssignmentsTable;
