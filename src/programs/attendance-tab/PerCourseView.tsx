import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { IntlShape } from 'react-intl';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Badge, Button, DataTable, Spinner,
} from '@openedx/paragon';
import {
  extractApiError,
  formatDateTime,
  getStatusVariant,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  SearchableSelect,
  SESSION_STATUS_LABELS,
  useIsBelowLg,
} from '@edly-io/frontend-component-fbr';
import { useDataTablePage } from '../data/useDataTablePage';
import { EMPTY_VALUE, MarkingWindowBadge } from './AttendanceCells';
import { useCourseSessions } from './data/apiHooks';
import type { CourseSession } from './data/types';
import messages from './messages';
import { useCourseOptions } from './useCourseOptions';

const NO_COURSE_VALUE = '__none__';
const PAGE_SIZE = 25;
const CENTERED = { cellClassName: 'text-center', headerClassName: 'justify-content-center' };

interface RowProps {
  row: { original: CourseSession };
}

const SessionStatusBadge = ({ status = '' }: { status?: string }) => (
  <Badge variant={getStatusVariant(status)}>{SESSION_STATUS_LABELS[status] || status}</Badge>
);

const buildSessionColumns = (intl: IntlShape, openRoster: (session: CourseSession) => void) => [
  {
    Header: intl.formatMessage(messages.columnTitle),
    accessor: 'title',
    Cell: ({ row }: RowProps) => <div>{row.original.title || EMPTY_VALUE}</div>,
  },
  {
    Header: intl.formatMessage(messages.columnDate),
    accessor: 'scheduled_start_time',
    Cell: ({ value }: { value?: string }) => (
      <span className="text-muted text-nowrap">{value ? formatDateTime(value) : EMPTY_VALUE}</span>
    ),
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.status),
    accessor: 'status',
    Cell: ({ value }: { value?: string }) => <SessionStatusBadge status={value} />,
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.markingWindow),
    id: 'marking_window',
    Cell: ({ row }: RowProps) => (
      <MarkingWindowBadge
        isOpen={row.original.marking_window_open}
        remainingDays={row.original.marking_window_remaining_days}
      />
    ),
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.columnActions),
    id: 'actions',
    Cell: ({ row }: RowProps) => (
      <Button variant="tertiary" size="sm" onClick={() => openRoster(row.original)}>
        {intl.formatMessage(messages.viewAttendance)}
      </Button>
    ),
    ...CENTERED,
  },
];

/** A course's completed sessions; each opens its roster. */
const PerCourseView = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const isBelowLg = useIsBelowLg();
  const [searchParams] = useSearchParams();
  const noCourseOption = useMemo(
    () => ({ value: NO_COURSE_VALUE, label: intl.formatMessage(messages.sessionsWithoutCourse) }),
    [intl],
  );
  const { options: courseOptions, coursesQuery } = useCourseOptions(programId, noCourseOption);

  const [courseKey, setCourseKey] = useState(searchParams.get('course_id') || '');
  const { pageIndex, fetchData } = useDataTablePage(courseKey);
  const sessionsQuery = useCourseSessions(
    courseKey === NO_COURSE_VALUE ? null : courseKey,
    programId,
    { page: pageIndex + 1, pageSize: PAGE_SIZE },
    Boolean(courseKey),
  );
  const sessions = sessionsQuery.data?.results ?? [];
  const count = sessionsQuery.data?.count ?? 0;
  const selectedOption = courseOptions.find((option) => option.value === courseKey) ?? null;

  // The roster shows the session's title, time and course from here; a deep link shows less.
  const openRoster = (session: CourseSession) => navigate(
    `/programs/${programId}/attendance/sessions/${session.id}?course_id=${encodeURIComponent(courseKey)}`,
    {
      state: {
        sessionTitle: session.title,
        sessionTime: session.scheduled_start_time,
        courseName: courseKey === NO_COURSE_VALUE ? null : selectedOption?.label ?? null,
        markingWindowRemainingDays: session.marking_window_remaining_days ?? null,
      },
    },
  );

  const columns = buildSessionColumns(intl, openRoster);

  return (
    <div className="py-3">
      <h3 className="mb-1">{intl.formatMessage(messages.byCourseTitle)}</h3>
      <p className="text-muted mb-3">{intl.formatMessage(messages.byCourseIntro)}</p>

      {coursesQuery.isError && (
        <Alert variant="danger">{extractApiError(coursesQuery.error, intl.formatMessage(messages.loadCoursesError))}</Alert>
      )}
      {sessionsQuery.isError && (
        <Alert variant="danger">{extractApiError(sessionsQuery.error, intl.formatMessage(messages.loadSessionsError))}</Alert>
      )}

      <div className="attendance-tab__picker mb-4">
        <SearchableSelect
          id="per-course-selector"
          label={intl.formatMessage(messages.course)}
          options={courseOptions}
          value={selectedOption}
          onChange={(option) => setCourseKey(option ? String(option.value) : '')}
          loading={coursesQuery.isPending}
          placeholder={intl.formatMessage(messages.searchCourses)}
        />
      </div>

      {!courseKey && <Alert variant="info">{intl.formatMessage(messages.selectCourseForSessions)}</Alert>}

      {courseKey && sessionsQuery.isFetching && (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">{intl.formatMessage(messages.loadingSessions)}</p>
        </div>
      )}

      {courseKey && (
        <DataTable
          key={courseKey}
          isPaginated
          manualPagination
          fetchData={fetchData}
          pageCount={Math.max(1, Math.ceil(count / PAGE_SIZE))}
          itemCount={count}
          data={sessions}
          columns={columns}
          initialState={{ pageIndex, pageSize: PAGE_SIZE }}
        >
          {!isBelowLg && <DataTable.Table />}
          {isBelowLg && sessions.length > 0 && (
            <MobileRowCardsList>
              {sessions.map((session: CourseSession) => (
                <MobileRowCard
                  key={session.id}
                  title={session.title || EMPTY_VALUE}
                  subtitle={session.scheduled_start_time ? formatDateTime(session.scheduled_start_time) : null}
                  footer={(
                    <Button variant="tertiary" size="sm" onClick={() => openRoster(session)}>
                      {intl.formatMessage(messages.viewAttendance)}
                    </Button>
                  )}
                >
                  <MobileRowField label={intl.formatMessage(messages.status)}>
                    <SessionStatusBadge status={session.status} />
                  </MobileRowField>
                  <MobileRowField label={intl.formatMessage(messages.markingWindowField)}>
                    <MarkingWindowBadge
                      isOpen={session.marking_window_open}
                      remainingDays={session.marking_window_remaining_days}
                    />
                  </MobileRowField>
                </MobileRowCard>
              ))}
            </MobileRowCardsList>
          )}
          <DataTable.EmptyTable content={intl.formatMessage(messages.noSessions)} />
          <DataTable.TableFooter />
        </DataTable>
      )}
    </div>
  );
};

export default PerCourseView;
