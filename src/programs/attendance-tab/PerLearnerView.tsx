import React, { useMemo, useState } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, DataTable, Spinner,
} from '@openedx/paragon';
import {
  extractApiError,
  formatDateTime,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  SearchableSelect,
  useConfig,
  useIsBelowLg,
  USER_ROLE,
} from '@edly-io/frontend-component-fbr';
import { useDataTablePage } from '../data/useDataTablePage';
import {
  EMPTY_VALUE, getRemainingWindowDays, LEAVE_STATUS, MarkingWindowBadge, MutedText, NoteControl, SourceBadge,
  StatusControl,
} from './AttendanceCells';
import { AttendanceEditModals, useAttendanceEditing } from './AttendanceEditing';
import { useProgramLearners, useTraineeAttendance } from './data/apiHooks';
import type { ProgramLearner, TraineeAttendanceRow } from './data/types';
import messages from './messages';
import { useCourseOptions } from './useCourseOptions';

const NO_COURSE_VALUE = '__none__';
const PAGE_SIZE = 50;
const CENTERED = { cellClassName: 'text-center', headerClassName: 'justify-content-center' };

interface HistoryRow extends TraineeAttendanceRow {
  sessionId: string;
  remainingDays: number | null;
}

interface RowProps {
  row: { original: HistoryRow };
}

const toLearnerOption = (learner: ProgramLearner) => {
  const fullName = [learner.first_name, learner.last_name].filter(Boolean).join(' ');
  return { value: learner.id, label: fullName ? `${fullName} (${learner.email})` : learner.email };
};

const SessionCell = ({ row }: RowProps) => (
  <div className="attendance-session-cell">
    <div>{row.original.session_title || EMPTY_VALUE}</div>
    {row.original.session_date && <small className="text-muted">{formatDateTime(row.original.session_date)}</small>}
  </div>
);

const OverrideReason = ({ row }: { row: HistoryRow }) => (
  row.is_overridden && row.override_reason
    ? <small className="text-muted">{row.override_reason}</small>
    : <span className="text-muted">{EMPTY_VALUE}</span>
);

interface HistoryRenderers {
  isAdmin: boolean;
  renderStatus: (row: HistoryRow) => React.ReactNode;
  renderNote: (row: HistoryRow) => React.ReactNode;
  renderWindow: (row: HistoryRow) => React.ReactNode;
}

const buildHistoryColumns = (intl: IntlShape, {
  isAdmin, renderStatus, renderNote, renderWindow,
}: HistoryRenderers) => [
  { Header: intl.formatMessage(messages.columnSession), accessor: 'session_title', Cell: SessionCell },
  {
    Header: intl.formatMessage(messages.status),
    id: 'status',
    Cell: ({ row }: RowProps) => renderStatus(row.original),
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.markingWindow),
    id: 'marking_window',
    Cell: ({ row }: RowProps) => renderWindow(row.original),
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.changeReason),
    accessor: 'override_reason',
    Cell: ({ row }: RowProps) => <OverrideReason row={row.original} />,
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.changedBy),
    id: 'marked_by',
    Cell: ({ row }: RowProps) => <MutedText value={row.original.overridden_by_email} />,
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.source),
    id: 'source',
    Cell: ({ row }: RowProps) => <SourceBadge source={row.original.source} />,
    ...CENTERED,
  },
  ...(isAdmin ? [{
    Header: intl.formatMessage(messages.note),
    id: 'note',
    Cell: ({ row }: RowProps) => renderNote(row.original),
    ...CENTERED,
  }] : []),
];

/** One learner's session-by-session attendance in a course, with the same marking controls as the roster. */
const PerLearnerView = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const { data: config } = useConfig();
  const isAdmin = config?.user_role === USER_ROLE.ADMIN;
  const noCourseOption = useMemo(
    () => ({ value: NO_COURSE_VALUE, label: intl.formatMessage(messages.sessionsWithoutCourseShort) }),
    [intl],
  );
  const { options: courseOptions, coursesQuery } = useCourseOptions(programId, noCourseOption);
  const learnersQuery = useProgramLearners(programId);
  const learnerOptions = useMemo(() => (learnersQuery.data ?? []).map(toLearnerOption), [learnersQuery.data]);

  const [courseKey, setCourseKey] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const { pageIndex, fetchData } = useDataTablePage(`${courseKey}:${userId}`);
  const historyQuery = useTraineeAttendance(userId, {
    programKey: programId,
    courseId: courseKey !== NO_COURSE_VALUE ? courseKey : undefined,
    page: pageIndex + 1,
    pageSize: PAGE_SIZE,
  });
  const editing = useAttendanceEditing();

  const rows = useMemo<HistoryRow[]>(() => (historyQuery.data?.results ?? []).map((row) => ({
    ...row,
    sessionId: String(row.session_id ?? row.session),
    remainingDays: row.marking_window_open
      ? getRemainingWindowDays(row.session_date, config?.marking_window_days)
      : null,
  })), [historyQuery.data, config?.marking_window_days]);
  const count = historyQuery.data?.count ?? 0;

  const target = (row: HistoryRow) => ({ sessionId: row.sessionId, userId: row.user_id });
  const renderStatus = (historyRow: HistoryRow) => (
    <StatusControl
      status={historyRow.status}
      canEdit={Boolean(isAdmin && historyRow.marking_window_open && historyRow.status !== LEAVE_STATUS)}
      isSaving={editing.isSaving(target(historyRow))}
      onChange={(status) => editing.changeStatus(target(historyRow), status, historyRow.record_id != null)}
    />
  );
  const renderNote = (historyRow: HistoryRow) => (
    <NoteControl
      tooltipId={`note-tip-${historyRow.sessionId}`}
      hasRecord={Boolean(historyRow.record_id)}
      notes={historyRow.notes}
      onOpen={() => editing.openNote(target(historyRow), historyRow.status ?? '', historyRow.notes ?? '')}
    />
  );
  const renderWindow = (historyRow: HistoryRow) => (
    <MarkingWindowBadge isOpen={historyRow.marking_window_open} remainingDays={historyRow.remainingDays} />
  );

  const columns = buildHistoryColumns(intl, {
    isAdmin, renderStatus, renderNote, renderWindow,
  });

  const loadError = coursesQuery.error ?? learnersQuery.error;

  return (
    <div className="py-3">
      <h3 className="mb-1">{intl.formatMessage(messages.byLearnerTitle)}</h3>
      <p className="text-muted mb-3">{intl.formatMessage(messages.byLearnerIntro)}</p>

      {loadError && <Alert variant="danger">{extractApiError(loadError, intl.formatMessage(messages.loadLearnersError))}</Alert>}
      {historyQuery.isError && (
        <Alert variant="danger">{extractApiError(historyQuery.error, intl.formatMessage(messages.historyError))}</Alert>
      )}
      {editing.error && <Alert variant="danger" dismissible onClose={editing.clearError}>{editing.error}</Alert>}

      <div className="d-flex flex-wrap mb-4 attendance-tab__pickers">
        <div className="attendance-tab__picker-item">
          <SearchableSelect
            id="per-learner-course"
            label={intl.formatMessage(messages.course)}
            options={courseOptions}
            value={courseOptions.find((option) => option.value === courseKey) ?? null}
            onChange={(option) => { setCourseKey(option ? String(option.value) : ''); setUserId(null); }}
            loading={coursesQuery.isPending}
            placeholder={intl.formatMessage(messages.searchCourses)}
          />
        </div>
        <div className="attendance-tab__picker-item">
          <SearchableSelect
            id="per-learner-user"
            label={intl.formatMessage(messages.learner)}
            options={learnerOptions}
            value={learnerOptions.find((option) => option.value === userId) ?? null}
            onChange={(option) => setUserId(option ? Number(option.value) : null)}
            loading={learnersQuery.isPending}
            disabled={!courseKey || learnerOptions.length === 0}
            placeholder={intl.formatMessage(courseKey ? messages.searchLearners : messages.selectCourseFirst)}
          />
        </div>
      </div>

      {!courseKey && <Alert variant="info">{intl.formatMessage(messages.selectCourseAndLearner)}</Alert>}
      {courseKey && userId === null && !learnersQuery.isPending && (
        <Alert variant="info">{intl.formatMessage(messages.selectLearner)}</Alert>
      )}
      {userId !== null && historyQuery.isPending && (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">{intl.formatMessage(messages.loadingHistory)}</p>
        </div>
      )}

      {userId !== null && (
        <DataTable
          key={`${courseKey}:${userId}`}
          isPaginated
          manualPagination
          fetchData={fetchData}
          pageCount={Math.max(1, Math.ceil(count / PAGE_SIZE))}
          itemCount={count}
          data={rows}
          columns={columns}
          initialState={{ pageIndex, pageSize: PAGE_SIZE }}
        >
          {!isBelowLg && (
            <div className="sticky-header-table sessions-table-scroll">
              <DataTable.Table />
              <DataTable.EmptyTable content={intl.formatMessage(messages.noRecords)} />
            </div>
          )}
          {isBelowLg && rows.length > 0 && (
            <MobileRowCardsList>
              {rows.map((row: HistoryRow) => (
                <MobileRowCard
                  key={`${row.sessionId}-${row.user_id}`}
                  title={row.session_title || EMPTY_VALUE}
                  subtitle={row.session_date ? formatDateTime(row.session_date) : null}
                  footer={isAdmin ? renderNote(row) : null}
                >
                  <MobileRowField label={intl.formatMessage(messages.status)}>{renderStatus(row)}</MobileRowField>
                  <MobileRowField label={intl.formatMessage(messages.markingWindowField)}>
                    {renderWindow(row)}
                  </MobileRowField>
                  {row.is_overridden && row.override_reason && (
                    <MobileRowField label={intl.formatMessage(messages.changeReason)}>
                      <small className="text-muted">{row.override_reason}</small>
                    </MobileRowField>
                  )}
                  {row.overridden_by_email && (
                    <MobileRowField label={intl.formatMessage(messages.changedBy)}>
                      <MutedText value={row.overridden_by_email} />
                    </MobileRowField>
                  )}
                  {row.source && (
                    <MobileRowField label={intl.formatMessage(messages.source)}>
                      <SourceBadge source={row.source} />
                    </MobileRowField>
                  )}
                </MobileRowCard>
              ))}
            </MobileRowCardsList>
          )}
          <DataTable.TableFooter />
        </DataTable>
      )}

      <AttendanceEditModals editing={editing} />
    </div>
  );
};

export default PerLearnerView;
