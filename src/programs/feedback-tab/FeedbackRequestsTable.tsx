import React from 'react';
import {
  Badge,
  Icon,
  IconButtonWithTooltip,
} from '@openedx/paragon';
import { RemoveRedEye as ViewIcon } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type {
  FeedbackRequest,
  FeedbackRequestStatus,
} from '../data/types';

const messages = defineMessages({
  feedbackName: { id: 'programs.feedback.table.feedback-name', defaultMessage: 'Feedback Name' },
  requestedBy: { id: 'programs.feedback.table.requested-by', defaultMessage: 'Requested By' },
  subject: { id: 'programs.feedback.table.subject', defaultMessage: 'Feedback About' },
  reviewer: { id: 'programs.feedback.table.reviewer', defaultMessage: 'Requested From' },
  course: { id: 'programs.feedback.table.course', defaultMessage: 'Course' },
  deadline: { id: 'programs.feedback.table.deadline', defaultMessage: 'Deadline' },
  requestedOn: { id: 'programs.feedback.table.requested-on', defaultMessage: 'Requested On' },
  submittedOn: { id: 'programs.feedback.table.submitted-on', defaultMessage: 'Submitted On' },
  status: { id: 'programs.feedback.table.status', defaultMessage: 'Status' },
  actions: { id: 'programs.feedback.table.actions', defaultMessage: 'Actions' },
  pending: { id: 'programs.feedback.table.status.pending', defaultMessage: 'Pending' },
  completed: { id: 'programs.feedback.table.status.completed', defaultMessage: 'Completed' },
  notSubmitted: { id: 'programs.feedback.table.status.not-submitted', defaultMessage: 'Not Submitted' },
  viewResponse: { id: 'programs.feedback.table.action.view', defaultMessage: 'View Response' },
});

const formatTableDate = (value: string | null) => {
  if (!value) {
    return '--';
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  const match = value.match(/^([A-Za-z]{3} \d{2}, \d{4})/);
  if (match) {
    return match[1];
  }

  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  return value;
};

const STATUS_BADGE_VARIANT: Record<FeedbackRequestStatus, string> = {
  Completed: 'success',
  'Not Submitted': 'danger',
  Pending: 'warning',
};

interface FeedbackRequestsTableProps {
  requests: FeedbackRequest[];
  onViewResponse: (request: FeedbackRequest) => void;
}

const FeedbackRequestsTable: React.FC<FeedbackRequestsTableProps> = ({
  requests,
  onViewResponse,
}) => {
  const intl = useIntl();
  const statusLabelByStatus: Record<FeedbackRequestStatus, string> = {
    Completed: intl.formatMessage(messages.completed),
    'Not Submitted': intl.formatMessage(messages.notSubmitted),
    Pending: intl.formatMessage(messages.pending),
  };

  return (
    <div className="feedback-table-wrapper">
      <table className="table feedback-table mb-0">
        <thead>
          <tr>
            <th>{intl.formatMessage(messages.feedbackName)}</th>
            <th>{intl.formatMessage(messages.requestedBy)}</th>
            <th>{intl.formatMessage(messages.subject)}</th>
            <th>{intl.formatMessage(messages.reviewer)}</th>
            <th>{intl.formatMessage(messages.course)}</th>
            <th className="feedback-table-nowrap">{intl.formatMessage(messages.deadline)}</th>
            <th className="feedback-table-nowrap">{intl.formatMessage(messages.requestedOn)}</th>
            <th className="feedback-table-nowrap">{intl.formatMessage(messages.submittedOn)}</th>
            <th className="feedback-table-nowrap">{intl.formatMessage(messages.status)}</th>
            <th className="feedback-table-nowrap">{intl.formatMessage(messages.actions)}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const { status } = request;

            return (
              <tr key={request.id}>
                <td className="feedback-table-feedback-name">{request.feedbackName}</td>
                <td>{request.requestedByName}</td>
                <td>{request.subjectName || '--'}</td>
                <td>{request.reviewerName}</td>
                <td className="feedback-table-course">{request.courseId}</td>
                <td className="feedback-table-nowrap">{formatTableDate(request.deadline)}</td>
                <td className="feedback-table-nowrap">{formatTableDate(request.created)}</td>
                <td className="feedback-table-nowrap">{formatTableDate(request.submittedAt)}</td>
                <td className="feedback-table-nowrap">
                  <Badge variant={STATUS_BADGE_VARIANT[status]}>
                    {statusLabelByStatus[status]}
                  </Badge>
                </td>
                <td className="feedback-table-nowrap">
                  <div className="feedback-table-action">
                    {status === 'Completed' ? (
                      <IconButtonWithTooltip
                        tooltipContent={intl.formatMessage(messages.viewResponse)}
                        src={ViewIcon}
                        onClick={() => onViewResponse(request)}
                        alt={intl.formatMessage(messages.viewResponse)}
                      />
                    ) : (
                      <span className="feedback-table-action-placeholder text-muted" aria-hidden="true">
                        <Icon src={ViewIcon} />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FeedbackRequestsTable;
