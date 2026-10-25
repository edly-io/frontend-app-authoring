import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Button } from '@openedx/paragon';
import {
  formatDateTime,
  SESSION_STATUS_LABELS,
  SUBSTITUTE_REQUEST_STATUS,
  SUBSTITUTE_REQUEST_STATUS_LABELS,
  SUBSTITUTE_REQUEST_STATUS_VARIANTS,
  UserIdentity,
} from '@edly-io/frontend-component-fbr';
import { EmptyValue } from './RequestCells';
import type { SubstituteRequest } from './data/types';
import messages from './messages';
import { getCovers, isSessionCancelled } from './substitutes';

const INSTRUCTOR_BADGE = 'Instructor';

export const CancelledBadge = ({ request }: { request: SubstituteRequest }) => (
  isSessionCancelled(request.session)
    ? <Badge variant="light" className="ml-2">{SESSION_STATUS_LABELS.cancelled}</Badge>
    : null
);

export const SessionCell = ({ request }: { request: SubstituteRequest }) => (
  <div>
    {/* The Status column reports the request's status, so the badge is what marks a cancelled class. */}
    <div className="d-flex align-items-center font-weight-bold text-nowrap">
      {request.session.title}
      <CancelledBadge request={request} />
    </div>
    <div className="text-muted requests-view__cell-meta text-nowrap">{formatDateTime(request.session.scheduled_start_time)}</div>
    {request.session.location?.name && (
      <div className="text-muted requests-view__cell-meta">{request.session.location.name}</div>
    )}
  </div>
);

export const OnLeaveInstructor = ({ request }: { request: SubstituteRequest }) => {
  const { leave_request: leave } = request;
  return (
    <div>
      <UserIdentity name={leave?.submitter_name || leave?.submitter_email} badges={[INSTRUCTOR_BADGE]} size="compact" />
      {leave?.submitter_name && leave?.submitter_email && (
        <small className="text-muted d-block mt-1">{leave.submitter_email}</small>
      )}
    </div>
  );
};

export const SubstituteStatusBadge = ({ status }: { status: string }) => (
  <Badge variant={SUBSTITUTE_REQUEST_STATUS_VARIANTS[status] || 'secondary'}>
    {SUBSTITUTE_REQUEST_STATUS_LABELS[status] || status}
  </Badge>
);

export const CoversCell = ({ request }: { request: SubstituteRequest }) => {
  const covers = getCovers(request);
  if (covers.length === 0) { return <EmptyValue />; }
  return (
    <div>
      {covers.map(({ email, name }) => (
        <div key={email} className="requests-view__cell-text">
          {name ? <>{name} <span className="text-muted">({email})</span></> : email}
        </div>
      ))}
    </div>
  );
};

export interface SubstituteActionHandlers {
  confirmingCancelId: number | null;
  onAssign: (request: SubstituteRequest) => void;
  onAskCancel: (request: SubstituteRequest | null) => void;
  onCancelSession: (request: SubstituteRequest) => void;
  onClose: (request: SubstituteRequest) => void;
}

export const SubstituteActions = ({
  request, confirmingCancelId, onAssign, onAskCancel, onCancelSession, onClose,
}: SubstituteActionHandlers & { request: SubstituteRequest }) => {
  const intl = useIntl();
  if (confirmingCancelId === request.id) {
    return (
      <div className="requests-view__cell-meta">
        <p className="mb-2 requests-view__confirm-text">{intl.formatMessage(messages.confirmCancelSession)}</p>
        <span className="requests-view__row-actions">
          <Button variant="danger" size="sm" onClick={() => onCancelSession(request)}>
            {intl.formatMessage(messages.cancelSession)}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => onAskCancel(null)}>{intl.formatMessage(messages.goBack)}</Button>
        </span>
      </div>
    );
  }
  if (request.status !== SUBSTITUTE_REQUEST_STATUS.OPEN) { return null; }
  if (isSessionCancelled(request.session)) {
    return (
      <Button variant="outline-secondary" size="sm" onClick={() => onClose(request)}>
        {intl.formatMessage(messages.closeRequest)}
      </Button>
    );
  }
  return (
    <span className="requests-view__row-actions">
      <Button variant="outline-primary" size="sm" onClick={() => onAssign(request)}>
        {intl.formatMessage(messages.assignSubstitute)}
      </Button>
      <Button variant="outline-danger" size="sm" onClick={() => onAskCancel(request)}>
        {intl.formatMessage(messages.cancelSession)}
      </Button>
    </span>
  );
};
