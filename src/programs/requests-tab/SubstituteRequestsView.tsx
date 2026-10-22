import React, { useMemo, useState } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Col, DataTable, Form, Row, Spinner,
} from '@openedx/paragon';
import {
  extractApiError,
  formatDateTime,
  formatLeaveRange,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  SUBSTITUTE_REQUEST_STATUS_LABELS,
  useIsBelowLg,
  useModalParams,
} from '@edly-io/frontend-component-fbr';
import { useDataTablePage } from '../data/useDataTablePage';
import AssignSubstituteModal from './AssignSubstituteModal';
import DateRangeFilter from './DateRangeFilter';
import {
  CancelledBadge, CoversCell, OnLeaveInstructor, SessionCell, SubstituteActions, SubstituteStatusBadge,
  type SubstituteActionHandlers,
} from './SubstituteCells';
import { useCancelCoveredSession, useCloseSubstituteRequest, useSubstituteRequests } from './data/apiHooks';
import type { SubstituteFilters, SubstituteRequest } from './data/types';
import messages from './messages';
import { getCovers } from './substitutes';

const PAGE_SIZE = 15;
const ASSIGN_MODAL = 'assign-substitute';
// Substitute request ids are integers; anything else in `?id=` is not a link this page made.
const SUBSTITUTE_ID_PATTERN = /^\d+$/;

interface RowProps {
  row: { original: SubstituteRequest };
}

const buildColumns = (intl: IntlShape, handlers: SubstituteActionHandlers) => [
  {
    Header: intl.formatMessage(messages.columnSession),
    id: 'session',
    Cell: ({ row }: RowProps) => <SessionCell request={row.original} />,
  },
  {
    Header: intl.formatMessage(messages.columnInstructorOnLeave),
    id: 'instructor',
    Cell: ({ row }: RowProps) => <OnLeaveInstructor request={row.original} />,
  },
  {
    Header: intl.formatMessage(messages.columnLeavePeriod),
    id: 'leave-period',
    Cell: ({ row }: RowProps) => <span className="text-nowrap">{formatLeaveRange(row.original.leave_request) || '—'}</span>,
  },
  {
    Header: intl.formatMessage(messages.status),
    accessor: 'status',
    Cell: ({ value }: { value: string }) => <SubstituteStatusBadge status={value} />,
  },
  {
    Header: intl.formatMessage(messages.columnSubstitute),
    id: 'substitute',
    Cell: ({ row }: RowProps) => <CoversCell request={row.original} />,
  },
  {
    Header: intl.formatMessage(messages.columnActions),
    id: 'actions',
    Cell: ({ row }: RowProps) => <SubstituteActions request={row.original} {...handlers} />,
  },
];

interface SubstituteCardsProps {
  requests: SubstituteRequest[];
  handlers: SubstituteActionHandlers;
}

const SubstituteCards = ({ requests, handlers }: SubstituteCardsProps) => {
  const intl = useIntl();
  return (
    <MobileRowCardsList>
      {requests.map((request) => (
        <MobileRowCard
          key={request.id}
          title={(
            <span className="d-flex align-items-center flex-wrap">
              <span>{request.session?.title}</span>
              <CancelledBadge request={request} />
            </span>
          )}
          subtitle={request.session?.scheduled_start_time ? formatDateTime(request.session.scheduled_start_time) : null}
          footer={<SubstituteActions request={request} {...handlers} />}
        >
          {request.session?.location?.name && (
            <MobileRowField label={intl.formatMessage(messages.locationField)}>
              {request.session.location.name}
            </MobileRowField>
          )}
          <MobileRowField label={intl.formatMessage(messages.instructorOnLeaveField)}>
            <OnLeaveInstructor request={request} />
          </MobileRowField>
          <MobileRowField label={intl.formatMessage(messages.columnLeavePeriod)}>
            {formatLeaveRange(request.leave_request) || '—'}
          </MobileRowField>
          <MobileRowField label={intl.formatMessage(messages.status)}>
            <SubstituteStatusBadge status={request.status} />
          </MobileRowField>
          {getCovers(request).length > 0 && (
            <MobileRowField label={intl.formatMessage(messages.columnSubstitute)}>
              <CoversCell request={request} />
            </MobileRowField>
          )}
        </MobileRowCard>
      ))}
    </MobileRowCardsList>
  );
};

/** Sessions whose instructor is on approved leave: assign cover, cancel the session, or close the request. */
const SubstituteRequestsView = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const {
    modal, modalId, openModal, closeModal,
  } = useModalParams();

  const [filters, setFilters] = useState<SubstituteFilters>({});
  const filterKey = JSON.stringify(filters);
  const { pageIndex, fetchData } = useDataTablePage(filterKey);
  const listQuery = useSubstituteRequests({
    ...filters, program_key: programId, page: pageIndex + 1, page_size: PAGE_SIZE,
  });
  const requests = listQuery.data?.results ?? [];
  const count = listQuery.data?.count ?? 0;

  const closeMutation = useCloseSubstituteRequest();
  const cancelMutation = useCancelCoveredSession();
  const [actionError, setActionError] = useState('');
  const [confirmingCancelId, setConfirmingCancelId] = useState<number | null>(null);

  const runAction = async (action: Promise<unknown>, fallback: typeof messages.cancelSessionError) => {
    try {
      await action;
    } catch (err) {
      setActionError(extractApiError(err as Error, intl.formatMessage(fallback)));
    }
  };

  const handlers: SubstituteActionHandlers = {
    confirmingCancelId,
    onAssign: (request) => openModal(ASSIGN_MODAL, request.id),
    onAskCancel: (request) => setConfirmingCancelId(request?.id ?? null),
    onCancelSession: async (request) => {
      await runAction(cancelMutation.mutateAsync(request), messages.cancelSessionError);
      setConfirmingCancelId(null);
    },
    onClose: (request) => runAction(closeMutation.mutateAsync(request), messages.closeSubstituteError),
  };

  const columns = useMemo(
    () => buildColumns(intl, handlers),
    // The handlers only read `confirmingCancelId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intl, confirmingCancelId],
  );

  if (listQuery.isPending) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{intl.formatMessage(messages.loadingSubstitutes)}</p>
      </div>
    );
  }

  const renderTable = () => {
    if (listQuery.isError) {
      return <Alert variant="danger">{extractApiError(listQuery.error, intl.formatMessage(messages.loadSubstitutesError))}</Alert>;
    }
    if (count === 0) {
      return <Alert variant="info">{intl.formatMessage(messages.noSubstitutes)}</Alert>;
    }
    return (
      <DataTable
        key={filterKey}
        isPaginated
        manualPagination
        fetchData={fetchData}
        pageCount={Math.max(1, Math.ceil(count / PAGE_SIZE))}
        itemCount={count}
        data={requests}
        columns={columns}
        initialState={{ pageIndex, pageSize: PAGE_SIZE }}
      >
        {!isBelowLg && (
          <div className="sticky-header-table sessions-table-scroll">
            <DataTable.Table />
            <DataTable.EmptyTable content={intl.formatMessage(messages.noSubstitutesTable)} />
          </div>
        )}
        {isBelowLg && requests.length > 0 && <SubstituteCards requests={requests} handlers={handlers} />}
        <DataTable.TableFooter />
      </DataTable>
    );
  };

  return (
    <div className="requests-view py-3">
      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}

      <Row className="requests-filters align-items-end">
        <Col xs={12} sm={6} md={4} lg={3} className="mb-2">
          <Form.Label htmlFor="substitute-requests-status" className="requests-filters__label">
            {intl.formatMessage(messages.status)}
          </Form.Label>
          <Form.Control
            id="substitute-requests-status"
            as="select"
            value={filters.status ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">{intl.formatMessage(messages.allStatuses)}</option>
            {Object.entries(SUBSTITUTE_REQUEST_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Form.Control>
        </Col>
        <Col xs={12} sm="auto" className="mb-2">
          <DateRangeFilter
            idPrefix="substitute"
            label={intl.formatMessage(messages.sessionDate)}
            from={filters.date_from ?? ''}
            to={filters.date_to ?? ''}
            onChange={({ from, to }) => setFilters({ ...filters, date_from: from, date_to: to })}
          />
        </Col>
      </Row>

      {renderTable()}

      {modal === ASSIGN_MODAL && modalId && SUBSTITUTE_ID_PATTERN.test(modalId) && (
        <AssignSubstituteModal
          requestId={modalId}
          listed={requests.find((request) => String(request.id) === modalId)}
          programKey={programId}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default SubstituteRequestsView;
