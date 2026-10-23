import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Button } from '@openedx/paragon';
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANTS, UserIdentity } from '@edly-io/frontend-component-fbr';
import type { AdminRequest } from './data/types';
import messages from './messages';

export const EMPTY_VALUE = '—';
const TRUNCATE_AT = 40;

export const EmptyValue = () => <span className="text-muted">{EMPTY_VALUE}</span>;

interface CollapsibleTextProps {
  text?: string;
  muted?: boolean;
}

/** Long reasons and notes show their first 40 characters with a more/less toggle. */
export const CollapsibleText = ({ text = '', muted = false }: CollapsibleTextProps) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const textClass = muted ? 'text-muted' : 'text-break';
  const sizeClass = muted ? 'requests-view__collapsible--muted' : '';
  if (text.length <= TRUNCATE_AT) {
    return <span className={`${textClass} ${sizeClass}`.trim()}>{text}</span>;
  }
  return (
    <span className={sizeClass}>
      <span className={textClass}>{expanded ? text : `${text.slice(0, TRUNCATE_AT)}…`}</span>
      {' '}
      <Button variant="link" onClick={() => setExpanded((prev) => !prev)} className="requests-view__collapsible-toggle">
        {intl.formatMessage(expanded ? messages.less : messages.more)}
      </Button>
    </span>
  );
};

export const RequestStatusBadge = ({ state }: { state: string }) => (
  <Badge variant={REQUEST_STATUS_VARIANTS[state] || 'secondary'}>{REQUEST_STATUS_LABELS[state] || state}</Badge>
);

const SUBMITTER_ROLE_MESSAGES: Record<string, typeof messages.roleAdmin> = {
  instructor: messages.roleInstructor,
  learner: messages.roleTrainee,
  admin: messages.roleAdmin,
};

interface SubmitterProps {
  request: AdminRequest;
  /** Leave-only flags: over the threshold, clashing with scheduled sessions. */
  showLeaveFlags: boolean;
}

export const Submitter = ({ request, showLeaveFlags }: SubmitterProps) => {
  const intl = useIntl();
  const displayName = request.submitter_name || request.submitter_email;
  if (!displayName) { return <EmptyValue />; }
  const roleMessage = request.submitter_role ? SUBMITTER_ROLE_MESSAGES[request.submitter_role] : undefined;
  return (
    <div>
      <UserIdentity
        name={displayName}
        badges={roleMessage ? [intl.formatMessage(roleMessage)] : []}
        size="compact"
      />
      {request.submitter_name && request.submitter_email && (
        <small className="text-muted d-block mt-1">{request.submitter_email}</small>
      )}
      {showLeaveFlags && request.would_exceed_threshold === true && (
        <small className="text-danger d-block mt-1">{intl.formatMessage(messages.wouldExceedThreshold)}</small>
      )}
      {showLeaveFlags && request.has_session_conflict === true && (
        <small className="requests-view__conflict-note d-block mt-1">{intl.formatMessage(messages.sessionConflict)}</small>
      )}
    </div>
  );
};

export const AttachmentLink = ({ url }: { url?: string | null }) => {
  if (!url) { return <EmptyValue />; }
  const filename = decodeURIComponent(url.split('/').pop() || 'file');
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="requests-view__attachment-link">{filename}</a>
  );
};
