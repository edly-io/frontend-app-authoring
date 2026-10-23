import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';
import { isLeaveStartDatePast, REQUEST_STATUS } from '@edly-io/frontend-component-fbr';
import type { AdminRequest } from './data/types';
import messages from './messages';

export interface RequestActionHandlers {
  onApprove: (request: AdminRequest) => void;
  onReject: (request: AdminRequest) => void;
  onApproveWithdrawal: (request: AdminRequest) => void;
  onRejectWithdrawal: (request: AdminRequest) => void;
}

interface RequestActionsProps extends RequestActionHandlers {
  request: AdminRequest;
  isBusy: boolean;
}

/** Review buttons for a pending request or a pending withdrawal; nothing for any other state. */
const RequestActions = ({
  request, isBusy, onApprove, onReject, onApproveWithdrawal, onRejectWithdrawal,
}: RequestActionsProps) => {
  const intl = useIntl();
  const isWithdrawal = request.state === REQUEST_STATUS.WITHDRAWAL_PENDING;
  if (request.state !== REQUEST_STATUS.PENDING && !isWithdrawal) { return null; }

  const warning = isWithdrawal ? messages.pastLeaveShortWarning : messages.pastLeaveApproveWarning;
  return (
    <div>
      {isLeaveStartDatePast(request) && (
        <small className="text-danger d-block mb-1">{intl.formatMessage(warning)}</small>
      )}
      <div className="requests-view__row-actions">
        <Button
          variant="primary"
          size="sm"
          onClick={() => (isWithdrawal ? onApproveWithdrawal(request) : onApprove(request))}
          disabled={isBusy}
        >
          {intl.formatMessage(isWithdrawal ? messages.approveWithdrawalAction : messages.approve)}
        </Button>
        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => (isWithdrawal ? onRejectWithdrawal(request) : onReject(request))}
          disabled={isBusy}
        >
          {intl.formatMessage(isWithdrawal ? messages.rejectWithdrawalAction : messages.reject)}
        </Button>
      </div>
    </div>
  );
};

export default RequestActions;
