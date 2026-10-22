import React, { useMemo, useState } from 'react';
import {
  Link, useLocation, useParams, useSearchParams,
} from 'react-router-dom';
import type { IntlShape } from 'react-intl';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Badge, Button, DataTable, Spinner, Stack,
} from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import {
  extractApiError,
  formatDateTime,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  useConfig,
  useIsBelowLg,
  USER_ROLE,
} from '@edly-io/frontend-component-fbr';
import {
  EMPTY_VALUE, getRemainingWindowDays, LEAVE_STATUS, MutedText, NoteControl, PENDING_STATUS, SourceBadge, StatusControl,
} from './AttendanceCells';
import { AttendanceEditModals, useAttendanceEditing } from './AttendanceEditing';
import { useAttendanceRoster, useSyncSessionAttendance } from './data/apiHooks';
import type { RosterRow, RosterSession } from './data/types';
import messages from './messages';

const PAGE_SIZE = 25;
const CENTERED = { cellClassName: 'text-center', headerClassName: 'justify-content-center' };
const COUNTED_STATUSES = ['present', 'absent', LEAVE_STATUS, PENDING_STATUS] as const;

/** What PerCourseView passes when it opens a roster; a deep link carries none of it. */
interface RosterNavState {
  sessionTitle?: string;
  sessionTime?: string;
  courseName?: string | null;
  markingWindowRemainingDays?: number | null;
}

interface RosterRowView extends RosterRow {
  currentStatus: string;
}

interface RowProps {
  row: { original: RosterRowView };
}

/** Zoom sync only helps between the meeting ending and the marking window closing; the backend agrees. */
const canSyncFromZoom = (session?: RosterSession) => Boolean(
  session?.meeting_id
  && session.marking_window_open
  && session.scheduled_end_time
  && new Date(session.scheduled_end_time).getTime() < Date.now(),
);

const countStatuses = (rows: RosterRowView[]) => Object.fromEntries(
  COUNTED_STATUSES.map((status) => [status, rows.filter((row) => row.currentStatus === status).length]),
) as Record<typeof COUNTED_STATUSES[number], number>;

const ChangeReason = ({ reason }: { reason?: string | null }) => (
  reason ? <small className="text-muted font-italic">{reason}</small> : <span className="text-muted">{EMPTY_VALUE}</span>
);

const LearnerCell = ({ row }: RowProps) => (
  <div>
    <div className="font-weight-bold">{row.original.full_name || row.original.username || EMPTY_VALUE}</div>
    <small className="text-muted">{row.original.email}</small>
  </div>
);

interface RosterRenderers {
  isAdmin: boolean;
  renderStatus: (row: RosterRowView) => React.ReactNode;
  renderNote: (row: RosterRowView) => React.ReactNode;
}

const buildRosterColumns = (intl: IntlShape, { isAdmin, renderStatus, renderNote }: RosterRenderers) => [
  { Header: intl.formatMessage(messages.learner), accessor: 'full_name', Cell: LearnerCell },
  {
    Header: intl.formatMessage(messages.status),
    id: 'status',
    Cell: ({ row }: RowProps) => renderStatus(row.original),
    ...CENTERED,
  },
  {
    Header: intl.formatMessage(messages.changeReason),
    id: 'reason',
    Cell: ({ row }: RowProps) => <ChangeReason reason={row.original.override_reason} />,
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

interface SessionCardProps {
  navState: RosterNavState | null;
  isWindowOpen: boolean;
  remainingDays: number | null;
  counts: ReturnType<typeof countStatuses>;
}

const SessionCard = ({
  navState, isWindowOpen, remainingDays, counts,
}: SessionCardProps) => {
  const intl = useIntl();
  return (
    <div className="border rounded p-3 mb-4 attendance-tab__session-card">
      {navState?.courseName && (
        <div className="mb-1">
          <span className="attendance-tab__eyebrow text-muted mr-1">{intl.formatMessage(messages.rosterCourse)}</span>
          <span className="attendance-meta text-muted">{navState.courseName}</span>
        </div>
      )}
      {navState?.sessionTitle && (
        <h4 className="mb-0">
          <span className="attendance-tab__eyebrow text-muted mr-2 align-middle">{intl.formatMessage(messages.rosterSession)}</span>
          {navState.sessionTitle}
        </h4>
      )}
      {navState?.sessionTime && <div className="attendance-meta text-muted mt-1">{formatDateTime(navState.sessionTime)}</div>}
      <div className="d-flex flex-column flex-sm-row justify-content-sm-between align-items-start align-items-sm-center">
        <div className="mb-2 mb-sm-0">
          {isWindowOpen ? (
            <strong className="attendance-meta text-success">
              {intl.formatMessage(messages.windowOpenBanner)}
              {remainingDays != null && intl.formatMessage(messages.daysRemaining, { days: remainingDays })}
            </strong>
          ) : (
            <strong className="attendance-meta text-muted">{intl.formatMessage(messages.windowClosedBanner)}</strong>
          )}
        </div>
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          <Badge variant="success">{intl.formatMessage(messages.countPresent, { count: counts.present })}</Badge>
          <Badge variant="danger">{intl.formatMessage(messages.countAbsent, { count: counts.absent })}</Badge>
          <Badge variant="warning">{intl.formatMessage(messages.countLeave, { count: counts.leave })}</Badge>
          <Badge variant="secondary">{intl.formatMessage(messages.countPending, { count: counts.pending })}</Badge>
        </Stack>
      </div>
    </div>
  );
};

/** One session's roster: mark present or absent, add notes, pull attendance from Zoom. */
const AttendanceRosterPage = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id') || '';
  const navState = useLocation().state as RosterNavState | null;
  const { data: config } = useConfig();
  const isAdmin = config?.user_role === USER_ROLE.ADMIN;

  const rosterQuery = useAttendanceRoster(sessionId);
  const syncMutation = useSyncSessionAttendance();
  const editing = useAttendanceEditing();
  const [syncMessage, setSyncMessage] = useState('');

  const session = rosterQuery.data?.session;
  const isWindowOpen = session?.marking_window_open ?? false;
  const rows = useMemo<RosterRowView[]>(
    () => (rosterQuery.data?.results ?? []).map((row) => ({ ...row, currentStatus: row.status || PENDING_STATUS })),
    [rosterQuery.data],
  );
  const counts = countStatuses(rows);
  const remainingDays = navState?.markingWindowRemainingDays ?? (
    isWindowOpen ? getRemainingWindowDays(session?.scheduled_end_time, config?.marking_window_days) : 0
  );

  const target = (row: RosterRow) => ({ sessionId, userId: row.user_id });
  const handleSync = () => {
    setSyncMessage('');
    syncMutation.mutate(sessionId, {
      onSuccess: (result) => setSyncMessage(result.message || intl.formatMessage(messages.synced)),
    });
  };

  const renderStatus = (rosterRow: RosterRowView) => (
    <StatusControl
      status={rosterRow.currentStatus}
      canEdit={isAdmin && isWindowOpen && rosterRow.currentStatus !== LEAVE_STATUS}
      isSaving={editing.isSaving(target(rosterRow))}
      onChange={(status) => editing.changeStatus(target(rosterRow), status, rosterRow.record_id != null)}
    />
  );
  const renderNote = (rosterRow: RosterRowView) => (
    <NoteControl
      tooltipId={`note-tip-${rosterRow.user_id}`}
      hasRecord={Boolean(rosterRow.record_id)}
      notes={rosterRow.notes}
      onOpen={() => editing.openNote(target(rosterRow), rosterRow.currentStatus, rosterRow.notes ?? '')}
    />
  );

  const columns = buildRosterColumns(intl, { isAdmin, renderStatus, renderNote });

  if (rosterQuery.isPending) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{intl.formatMessage(messages.loadingRoster)}</p>
      </div>
    );
  }

  const backPath = `/programs/${programId}/attendance/by-course${courseId ? `?course_id=${encodeURIComponent(courseId)}` : ''}`;
  const actionError = editing.error || (syncMutation.isError
    ? extractApiError(syncMutation.error, intl.formatMessage(messages.syncError)) : '');

  return (
    <div className="py-3">
      <Button as={Link} to={backPath} variant="tertiary" size="sm" iconBefore={ArrowBack} className="mb-3">
        {intl.formatMessage(messages.backToSessions)}
      </Button>

      {rosterQuery.isError ? (
        <Alert variant="danger">{extractApiError(rosterQuery.error, intl.formatMessage(messages.rosterError))}</Alert>
      ) : (
        <>
          <SessionCard navState={navState} isWindowOpen={isWindowOpen} remainingDays={remainingDays} counts={counts} />

          {isAdmin && canSyncFromZoom(session) && (
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3">
              <Button variant="outline-primary" size="sm" onClick={handleSync} disabled={syncMutation.isPending} className="text-nowrap">
                {intl.formatMessage(syncMutation.isPending ? messages.syncing : messages.syncFromZoom)}
              </Button>
              {syncMessage && <span className="small text-muted mt-2 mt-sm-0 ml-sm-2">{syncMessage}</span>}
            </div>
          )}

          {isAdmin && (
            <Alert variant={isWindowOpen ? 'info' : 'warning'} className="mb-3">
              {isWindowOpen
                ? intl.formatMessage(messages.windowOpenAlert, {
                  open: <strong>{intl.formatMessage(messages.openWord)}</strong>,
                })
                : intl.formatMessage(messages.windowClosedAlert, {
                  closed: <strong>{intl.formatMessage(messages.closedWord)}</strong>,
                })}
            </Alert>
          )}

          {actionError && (
            <Alert variant="danger" dismissible onClose={() => { editing.clearError(); syncMutation.reset(); }}>
              {actionError}
            </Alert>
          )}

          {rows.length === 0 ? (
            <Alert variant="info">{intl.formatMessage(messages.emptyRoster)}</Alert>
          ) : (
            <DataTable
              isPaginated={rows.length > PAGE_SIZE}
              data={rows}
              columns={columns}
              itemCount={rows.length}
              initialState={{ pageSize: PAGE_SIZE }}
            >
              {!isBelowLg && <DataTable.Table />}
              {isBelowLg && (
                <MobileRowCardsList>
                  {rows.map((row: RosterRowView) => (
                    <MobileRowCard
                      key={row.user_id}
                      title={row.full_name || row.username || EMPTY_VALUE}
                      subtitle={row.email}
                      footer={isAdmin ? renderNote(row) : null}
                    >
                      <MobileRowField label={intl.formatMessage(messages.status)}>{renderStatus(row)}</MobileRowField>
                      {row.override_reason && (
                        <MobileRowField label={intl.formatMessage(messages.changeReason)}>
                          <ChangeReason reason={row.override_reason} />
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
              {rows.length > PAGE_SIZE && <DataTable.TableFooter />}
            </DataTable>
          )}
        </>
      )}

      <AttendanceEditModals editing={editing} />
    </div>
  );
};

export default AttendanceRosterPage;
