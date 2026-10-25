import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge, Button, Icon, IconButton, OverlayTrigger, Stack, Tooltip,
} from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { ATTENDANCE_STATUS, getStatusVariant } from '@edly-io/frontend-component-fbr';
import messages from './messages';

export const EMPTY_VALUE = '—';
export const LEAVE_STATUS = 'leave';
export const PENDING_STATUS = 'pending';

export const MutedText = ({ value }: { value?: string | null }) => (
  <small className="text-muted">{value || EMPTY_VALUE}</small>
);

export const SourceBadge = ({ source }: { source?: string | null }) => (
  source ? <Badge variant="light">{source}</Badge> : <span className="text-muted">{EMPTY_VALUE}</span>
);

export const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) { return <span className="text-muted">{EMPTY_VALUE}</span>; }
  return <Badge variant={getStatusVariant(status)}>{ATTENDANCE_STATUS[status] || status}</Badge>;
};

const EDIT_OPTIONS = [
  { value: 'present', label: messages.present, variant: 'success' },
  { value: 'absent', label: messages.absent, variant: 'danger' },
];

interface StatusControlProps {
  status?: string;
  canEdit: boolean;
  isSaving: boolean;
  onChange: (status: string) => void;
}

/** Present / Absent toggle while the record is editable; otherwise the status badge. */
export const StatusControl = ({
  status, canEdit, isSaving, onChange,
}: StatusControlProps) => {
  const intl = useIntl();
  if (!canEdit) { return <StatusBadge status={status} />; }
  return (
    <Stack direction="horizontal" gap={1} className="justify-content-center">
      {EDIT_OPTIONS.map((option) => {
        const isSelected = status === option.value;
        return (
          <Button
            key={option.value}
            size="sm"
            variant={isSelected ? option.variant : 'outline-secondary'}
            onClick={() => !isSelected && onChange(option.value)}
            disabled={isSaving}
            className="attendance-status-btn"
          >
            {intl.formatMessage(option.label)}
          </Button>
        );
      })}
    </Stack>
  );
};

interface MarkingWindowBadgeProps {
  isOpen?: boolean;
  remainingDays?: number | null;
}

export const MarkingWindowBadge = ({ isOpen, remainingDays }: MarkingWindowBadgeProps) => {
  const intl = useIntl();
  if (!isOpen) { return <Badge variant="secondary">{intl.formatMessage(messages.windowClosed)}</Badge>; }
  return (
    <div>
      <Badge variant="success">{intl.formatMessage(messages.windowOpen)}</Badge>
      {remainingDays != null && (
        <small className="text-muted d-block mt-1">{intl.formatMessage(messages.daysLeft, { days: remainingDays })}</small>
      )}
    </div>
  );
};

interface NoteControlProps {
  tooltipId: string;
  hasRecord: boolean;
  notes?: string | null;
  onOpen: () => void;
}

/** Add or edit a record's note; a learner with no record yet has nothing to attach it to. */
export const NoteControl = ({
  tooltipId, hasRecord, notes, onOpen,
}: NoteControlProps) => {
  const intl = useIntl();
  if (!hasRecord) {
    return (
      <OverlayTrigger
        trigger={['hover', 'focus']}
        overlay={<Tooltip id={tooltipId}>{intl.formatMessage(messages.noteNeedsRecord)}</Tooltip>}
      >
        <span>
          <Button variant="outline-primary" size="sm" disabled className="text-nowrap">{intl.formatMessage(messages.addNote)}</Button>
        </span>
      </OverlayTrigger>
    );
  }
  if (!notes) {
    return (
      <Button variant="outline-primary" size="sm" onClick={onOpen}>{intl.formatMessage(messages.addNote)}</Button>
    );
  }
  return (
    <Stack direction="horizontal" gap={2}>
      <small className="text-muted">{notes}</small>
      <IconButton src={Edit} iconAs={Icon} variant="primary" size="sm" alt={intl.formatMessage(messages.editNote)} onClick={onOpen} />
    </Stack>
  );
};

const MS_PER_DAY = 86_400_000;

/** Whole days left before the marking window closes, counted from when the session ended. */
export const getRemainingWindowDays = (endedAt: string | null | undefined, windowDays: number | null | undefined) => {
  if (!endedAt || windowDays == null) { return null; }
  const deadline = new Date(endedAt).getTime() + windowDays * MS_PER_DAY;
  return Math.max(0, Math.ceil((deadline - Date.now()) / MS_PER_DAY));
};
