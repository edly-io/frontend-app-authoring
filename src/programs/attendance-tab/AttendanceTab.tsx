import React from 'react';
import {
  Navigate, Outlet, Route, Routes, useSearchParams,
} from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, ButtonGroup } from '@openedx/paragon';
import { AuditLogTable } from '@edly-io/frontend-component-fbr';
import AttendanceRosterPage from './AttendanceRosterPage';
import AttendanceSubNav from './AttendanceSubNav';
import CourseSummaryReport from './CourseSummaryReport';
import PerCourseView from './PerCourseView';
import PerLearnerView from './PerLearnerView';
import messages from './messages';
import './attendance-tab.scss';

const VIEW_PARAM = 'view';
const RECORD_PARAM = 'record_id';
const LIST_VIEW = 'list';
const AUDIT_LOG_VIEW = 'audit-log';
const AUDITED_MODELS = ['attendancerecord'];

/** The Attendance / Audit Log switch, then either the audit log or the sub-tabs above the active one. */
const AttendanceLayout = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get(VIEW_PARAM) || LIST_VIEW;

  const updateParams = (change: (params: URLSearchParams) => void) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    change(next);
    return next;
  });
  const showView = (view: string) => updateParams((params) => {
    params.set(VIEW_PARAM, view);
    if (view !== AUDIT_LOG_VIEW) { params.delete(RECORD_PARAM); }
  });

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
    <div className="attendance-tab">
      <div className="d-flex justify-content-end mb-3">
        <ButtonGroup size="sm" className="program-view-toggle">
          {renderViewButton(LIST_VIEW, intl.formatMessage(messages.viewList))}
          {renderViewButton(AUDIT_LOG_VIEW, intl.formatMessage(messages.viewAuditLog))}
        </ButtonGroup>
      </div>
      {activeView === AUDIT_LOG_VIEW ? (
        <AuditLogTable
          appLabel="attendance"
          models={AUDITED_MODELS}
          programKey={programId}
          recordFilter={searchParams.get(RECORD_PARAM) || undefined}
          onClearFilter={() => updateParams((params) => params.delete(RECORD_PARAM))}
        />
      ) : (
        <>
          <AttendanceSubNav programId={programId} />
          <Outlet />
        </>
      )}
    </div>
  );
};

/** Admin attendance at `attendance/{dashboard,by-course,by-learner,sessions/:sessionId}`, as in fbr-home. */
const AttendanceTab = ({ programId }: { programId: string }) => {
  const toDashboard = <Navigate to={`/programs/${programId}/attendance/dashboard`} replace />;
  return (
    <Routes>
      <Route path="attendance" element={<AttendanceLayout programId={programId} />}>
        <Route index element={toDashboard} />
        <Route path="dashboard" element={<CourseSummaryReport programId={programId} />} />
        <Route path="by-course" element={<PerCourseView programId={programId} />} />
        <Route path="by-learner" element={<PerLearnerView programId={programId} />} />
        <Route path="sessions/:sessionId" element={<AttendanceRosterPage programId={programId} />} />
        <Route path="*" element={toDashboard} />
      </Route>
    </Routes>
  );
};

export default AttendanceTab;
