import React, { useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, DataTable, Form, Spinner,
} from '@openedx/paragon';
import {
  extractApiError,
  isLeaveStartDatePast,
  REQUEST_STATUS,
  REQUEST_TYPE,
  SectionHeading,
  SessionLeavesPanel,
  useIsBelowLg,
} from '@edly-io/frontend-component-fbr';
import { useDataTablePage } from '../data/useDataTablePage';
import BulkApproveConfirmModal from './BulkApproveConfirmModal';
import LeaveUsagePanel from './LeaveUsagePanel';
import ReviewNoteModal, { type NoteReview } from './ReviewNoteModal';
import RequestFiltersRow from './RequestFiltersRow';
import { buildRequestColumns, RequestCards, type RequestRowOptions } from './requestColumns';
import { useBulkApproveLeaves, useRequests, useReviewRequest } from './data/apiHooks';
import type { AdminRequest, RequestFilters, RequestType } from './data/types';
import messages from './messages';

const PAGE_SIZE = 15;
const NO_SELECTION: ReadonlySet<string> = new Set();

interface NoteTarget {
  request: AdminRequest;
  targetState: string;
  review: NoteReview;
}

/** Pending leaves on the page, selectable for bulk approval. The selection resets with the page or filters. */
const usePendingSelection = (requests: AdminRequest[], selectionKey: string) => {
  const [selection, setSelection] = useState({ key: selectionKey, ids: NO_SELECTION });
  const selectedIds = selection.key === selectionKey ? selection.ids : NO_SELECTION;
  const pendingIds = useMemo(
    () => requests.filter((request) => request.state === REQUEST_STATUS.PENDING).map((request) => request.id),
    [requests],
  );
  const setSelected = (ids: ReadonlySet<string>) => setSelection({ key: selectionKey, ids });
  return {
    pendingIds,
    selectedIds,
    isAllSelected: pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id)),
    selectAll: (checked: boolean) => setSelected(checked ? new Set(pendingIds) : NO_SELECTION),
    clear: () => setSelected(NO_SELECTION),
  };
};

interface AdminRequestsViewProps {
  programId: string;
  lockedType: RequestType;
}

/** Review, bulk-approve and audit a program's leave or remote-session requests. */
const AdminRequestsView = ({ programId, lockedType }: AdminRequestsViewProps) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const isLeaves = lockedType === REQUEST_TYPE.LEAVE;

  const [filters, setFilters] = useState<RequestFilters>({});
  const filterKey = `${lockedType}:${JSON.stringify(filters)}`;
  const { pageIndex, fetchData } = useDataTablePage(filterKey);
  const requestsQuery = useRequests(lockedType, {
    ...filters, program_key: programId, page: pageIndex + 1, page_size: PAGE_SIZE,
  });
  const requests = requestsQuery.data?.results ?? [];
  const count = requestsQuery.data?.count ?? 0;

  const reviewMutation = useReviewRequest();
  const bulkMutation = useBulkApproveLeaves();
  const selection = usePendingSelection(requests, `${filterKey}:${pageIndex}`);
  const [actionError, setActionError] = useState('');
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [bulkPastLeaves, setBulkPastLeaves] = useState<AdminRequest[] | null>(null);

  const applyReview = async (request: AdminRequest, state: string, reviewerNote = '') => {
    try {
      await reviewMutation.mutateAsync({ request, state, reviewerNote });
    } catch (err) {
      setActionError(extractApiError(err as Error, intl.formatMessage(messages.updateRequestError)));
    }
  };

  const openNoteModal = (request: AdminRequest, targetState: string, review: NoteReview) => (
    setNoteTarget({ request, targetState, review })
  );

  const rejectReview = (title: typeof messages.rejectRequestTitle): NoteReview => ({
    title: intl.formatMessage(title),
    confirmLabel: intl.formatMessage(title),
    confirmVariant: 'danger',
    noteRequired: false,
  });

  // Approving the withdrawal of a past-dated leave reverses an approved leave, so it needs a
  // justification note (also enforced server-side). Forward approvals stay one click.
  const handlers: RequestRowOptions = {
    programKey: programId,
    isLeaves,
    isRequestBusy: (request) => reviewMutation.isPending && reviewMutation.variables?.request.id === request.id,
    onApprove: (request) => applyReview(request, REQUEST_STATUS.APPROVED),
    onReject: (request) => openNoteModal(request, REQUEST_STATUS.REJECTED, rejectReview(messages.rejectRequestTitle)),
    onApproveWithdrawal: (request) => {
      if (!isLeaveStartDatePast(request)) {
        applyReview(request, REQUEST_STATUS.WITHDRAWN);
        return;
      }
      openNoteModal(request, REQUEST_STATUS.WITHDRAWN, {
        title: intl.formatMessage(messages.approveWithdrawalTitle),
        confirmLabel: intl.formatMessage(messages.approveWithdrawalTitle),
        confirmVariant: 'success',
        noteRequired: true,
        warning: intl.formatMessage(messages.pastLeaveWithdrawalWarning),
      });
    },
    onRejectWithdrawal: (request) => openNoteModal(
      request,
      REQUEST_STATUS.WITHDRAWAL_REJECTED,
      rejectReview(messages.rejectWithdrawalTitle),
    ),
  };

  const confirmNote = async (note: string) => {
    if (!noteTarget) { return; }
    await applyReview(noteTarget.request, noteTarget.targetState, note);
    setNoteTarget(null);
  };

  const bulkApprove = async () => {
    setBulkPastLeaves(null);
    try {
      const result = await bulkMutation.mutateAsync({ programKey: programId, leaveIds: [...selection.selectedIds] });
      selection.clear();
      if (result.ignored_count > 0) {
        setActionError(intl.formatMessage(messages.bulkApprovePartial, {
          approved: result.approved_count, ignored: result.ignored_count,
        }));
      }
    } catch (err) {
      setActionError(extractApiError(err as Error, intl.formatMessage(messages.bulkApproveError)));
    }
  };

  // Warn once, listing the selected leaves whose date has already passed.
  const handleBulkApprove = () => {
    const pastLeaves = requests.filter(
      (request) => selection.selectedIds.has(request.id) && isLeaveStartDatePast(request),
    );
    if (pastLeaves.length > 0) {
      setBulkPastLeaves(pastLeaves);
      return;
    }
    bulkApprove();
  };

  const columns = useMemo(
    () => buildRequestColumns(intl, handlers),
    // The handlers only read the review state captured below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intl, programId, isLeaves, reviewMutation.isPending, reviewMutation.variables],
  );

  if (requestsQuery.isPending) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{intl.formatMessage(messages.loadingRequests)}</p>
      </div>
    );
  }

  const renderTable = () => {
    if (requestsQuery.isError) {
      return (
        <Alert variant="danger">
          {extractApiError(requestsQuery.error, intl.formatMessage(messages.loadRequestsError))}
        </Alert>
      );
    }
    if (count === 0) {
      return <Alert variant="info">{intl.formatMessage(messages.noRequests)}</Alert>;
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
            <DataTable.EmptyTable content={intl.formatMessage(messages.noRequestsTable)} />
          </div>
        )}
        {isBelowLg && requests.length > 0 && <RequestCards requests={requests} options={handlers} intl={intl} />}
        <DataTable.TableFooter />
      </DataTable>
    );
  };

  return (
    <div className="requests-view py-3">
      {actionError && (
        <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>
      )}

      <div className="mb-5">
        <SectionHeading>{intl.formatMessage(messages.sectionRequests)}</SectionHeading>
        <RequestFiltersRow filters={filters} onChange={setFilters} />

        {isLeaves && selection.pendingIds.length > 0 && (
          <div className="requests-view__inline-status requests-view__bulk-bar flex-wrap mb-3">
            <Form.Checkbox
              id="select-all-pending"
              checked={selection.isAllSelected}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => selection.selectAll(e.target.checked)}
            >
              {intl.formatMessage(messages.selectAllPending, { count: selection.pendingIds.length })}
            </Form.Checkbox>
            {/* Always rendered, disabled until something is selected, so the layout never shifts. */}
            <Button
              variant="warning"
              size="sm"
              className="requests-view__bulk-approve"
              onClick={handleBulkApprove}
              disabled={bulkMutation.isPending || selection.selectedIds.size === 0}
            >
              {bulkMutation.isPending && <Spinner animation="border" size="sm" className="mr-1" />}
              {selection.selectedIds.size > 0
                ? intl.formatMessage(messages.bulkApproveCount, { count: selection.selectedIds.size })
                : intl.formatMessage(messages.bulkApprove)}
            </Button>
          </div>
        )}

        {renderTable()}
      </div>

      {isLeaves && (
        <>
          <div className="mb-5">
            <SectionHeading>{intl.formatMessage(messages.sectionLeaveSummaries)}</SectionHeading>
            <LeaveUsagePanel programKey={programId} />
          </div>
          <SessionLeavesPanel programKey={programId} />
        </>
      )}

      {noteTarget && (
        <ReviewNoteModal
          review={noteTarget.review}
          isSubmitting={reviewMutation.isPending}
          onClose={() => setNoteTarget(null)}
          onConfirm={confirmNote}
        />
      )}

      {bulkPastLeaves && (
        <BulkApproveConfirmModal
          selectedCount={selection.selectedIds.size}
          pastLeaves={bulkPastLeaves}
          onClose={() => setBulkPastLeaves(null)}
          onConfirm={bulkApprove}
        />
      )}
    </div>
  );
};

export default AdminRequestsView;
