import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, StandardModal } from '@openedx/paragon';
import { formatLeaveRange } from '@edly-io/frontend-component-fbr';
import type { AdminRequest } from './data/types';
import messages from './messages';

interface BulkApproveConfirmModalProps {
  selectedCount: number;
  pastLeaves: AdminRequest[];
  onClose: () => void;
  onConfirm: () => void;
}

/** Lists the selected leaves whose date has passed before a bulk approve goes ahead. */
const BulkApproveConfirmModal = ({
  selectedCount, pastLeaves, onClose, onConfirm,
}: BulkApproveConfirmModalProps) => {
  const intl = useIntl();
  const pastCount = pastLeaves.length;
  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={intl.formatMessage(messages.bulkPastTitle, { count: pastCount })}
      isFullscreenOnMobile
      footerNode={(
        <>
          <Button variant="tertiary" onClick={onClose}>{intl.formatMessage(messages.cancel)}</Button>
          <Button variant="success" onClick={onConfirm} className="ml-2">
            {intl.formatMessage(messages.bulkPastConfirm, { count: selectedCount })}
          </Button>
        </>
      )}
    >
      <p className="mb-2">{intl.formatMessage(messages.bulkPastBody, { selected: selectedCount, past: pastCount })}</p>
      <ul className="pl-3 mb-2">
        {pastLeaves.map((leave) => (
          <li key={leave.id}>
            {leave.submitter_name || leave.submitter_email}
            {' — '}
            {formatLeaveRange(leave)}
            {leave.reason ? ` (${leave.reason})` : ''}
          </li>
        ))}
      </ul>
      <p className="mb-0">{intl.formatMessage(messages.bulkPastQuestion, { count: pastCount })}</p>
    </StandardModal>
  );
};

export default BulkApproveConfirmModal;
