import React from 'react';
import {
  Navigate, Outlet, Route, Routes, useMatch, useSearchParams,
} from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, ButtonGroup, Stack } from '@openedx/paragon';
import { AuditLogTable, REQUEST_TYPE } from '@edly-io/frontend-component-fbr';
import AdminRequestsView from './AdminRequestsView';
import LeaveSettingsModal from './LeaveSettingsModal';
import RequestsSubNav from './RequestsSubNav';
import SubstituteRequestsView from './SubstituteRequestsView';
import messages from './messages';
import './requests-tab.scss';

const VIEW_PARAM = 'view';
const RECORD_PARAM = 'record_id';
const LIST_VIEW = 'list';
const AUDIT_LOG_VIEW = 'audit-log';
const AUDITED_MODELS = ['leaverequest', 'remotesessionrequest', 'substituterequest'];

/** `?view=` and `?record_id=` drive the Requests / Audit Log switch, as in fbr-home. */
const useRequestsView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const showView = (view: string) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set(VIEW_PARAM, view);
    if (view !== AUDIT_LOG_VIEW) { next.delete(RECORD_PARAM); }
    return next;
  });
  const clearRecordFilter = () => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete(RECORD_PARAM);
    return next;
  });
  return {
    activeView: searchParams.get(VIEW_PARAM) || LIST_VIEW,
    recordFilter: searchParams.get(RECORD_PARAM) || undefined,
    showView,
    clearRecordFilter,
  };
};

/** The view switch, then either the audit log or the sub-tabs above the active one. */
const RequestsLayout = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const {
    activeView, recordFilter, showView, clearRecordFilter,
  } = useRequestsView();
  const isLeavesTab = Boolean(useMatch('/programs/:programId/requests/leaves'));
  const isAuditLog = activeView === AUDIT_LOG_VIEW;

  const renderViewButton = (view: string, label: string) => (
    <Button
      variant={activeView === view ? 'primary' : 'outline-primary'}
      size="sm"
      aria-pressed={activeView === view}
      onClick={() => showView(view)}
    >
      {label}
    </Button>
  );

  return (
    <div className="requests-tab">
      <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-end mb-3">
        {isLeavesTab && !isAuditLog && <LeaveSettingsModal programKey={programId} />}
        <ButtonGroup size="sm">
          {renderViewButton(LIST_VIEW, intl.formatMessage(messages.viewList))}
          {renderViewButton(AUDIT_LOG_VIEW, intl.formatMessage(messages.viewAuditLog))}
        </ButtonGroup>
      </Stack>

      {isAuditLog ? (
        <AuditLogTable
          appLabel="attendance"
          models={AUDITED_MODELS}
          programKey={programId}
          recordFilter={recordFilter}
          onClearFilter={clearRecordFilter}
        />
      ) : (
        <>
          <RequestsSubNav programId={programId} />
          <Outlet />
        </>
      )}
    </div>
  );
};

/** Admin requests at `requests/{leaves,remote-sessions,substitute-requests}`, the same paths as fbr-home. */
const RequestsTab = ({ programId }: { programId: string }) => {
  const defaultSubTab = <Navigate to={`/programs/${programId}/requests/leaves`} replace />;
  return (
    <Routes>
      <Route path="requests" element={<RequestsLayout programId={programId} />}>
        <Route index element={defaultSubTab} />
        <Route path="leaves" element={<AdminRequestsView programId={programId} lockedType={REQUEST_TYPE.LEAVE} />} />
        <Route
          path="remote-sessions"
          element={<AdminRequestsView programId={programId} lockedType={REQUEST_TYPE.REMOTE_SESSION} />}
        />
        <Route path="substitute-requests" element={<SubstituteRequestsView programId={programId} />} />
        <Route path="*" element={defaultSubTab} />
      </Route>
    </Routes>
  );
};

export default RequestsTab;
