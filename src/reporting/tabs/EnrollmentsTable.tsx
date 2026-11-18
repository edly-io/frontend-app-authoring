import { useMemo, useState } from 'react';
import { ProgressBar } from '@openedx/paragon';

import { useCourseEnrollments } from '../data/apiHooks';
import type { CourseEnrollmentRow } from '../data/api';
import messages from '../messages';
import useFormatters from '../useFormatters';
import { PAGE_SIZE } from '../types';
import type { Column, TableProps } from '../types';
import ReportTable from '../components/ReportTable';

const EnrollmentsTable = ({ courseId, search, onSearch }: TableProps & { courseId: string; }) => {
  const f = useFormatters();
  const { intl } = f;
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useCourseEnrollments(courseId, page, PAGE_SIZE, search);

  const columns: Column<CourseEnrollmentRow>[] = useMemo(() => [
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
      Header: intl.formatMessage(messages.colEnrolled),
      accessor: 'enrolledAt',
      Cell: ({ row }) => f.date(row.original.enrolledAt),
    },
    {
      Header: intl.formatMessage(messages.colProgress),
      accessor: 'progressPct',
      Cell: ({ row }) => (row.original.progressPct === null || row.original.progressPct === undefined
        ? f.dash
        : (
          <div className="reporting-progress">
            <ProgressBar now={row.original.progressPct} variant="info" />
            <span>{f.percent(row.original.progressPct)}</span>
          </div>
        )),
    },
    {
      Header: intl.formatMessage(messages.colCompletedUnits),
      accessor: 'completedUnits',
      Cell: ({ row }) => (row.original.completedUnits === null || row.original.completedUnits === undefined
        ? f.dash
        : intl.formatMessage(messages.unitsOf, {
          completed: f.number(row.original.completedUnits),
          total: f.number(row.original.totalUnits),
        })),
    },
    {
      Header: intl.formatMessage(messages.colLastActivity),
      accessor: 'lastActivity',
      Cell: ({ row }) => f.date(row.original.lastActivity),
    },
    {
      Header: intl.formatMessage(messages.colCompleted),
      accessor: 'completedAt',
      Cell: ({ row }) => f.date(row.original.completedAt),
    },
    {
      Header: intl.formatMessage(messages.colBadge),
      accessor: 'badgeAwarded',
      Cell: ({ row }) => f.badge(row.original.badgeConfigured, row.original.badgeAwarded),
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
      emptyMessage={intl.formatMessage(messages.emptyEnrollments)}
    />
  );
};

export default EnrollmentsTable;
