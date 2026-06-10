import React from 'react';
import {
  Badge,
  Icon,
  IconButtonWithTooltip,
} from '@openedx/paragon';
import { RemoveRedEye as ViewIcon } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import {
  getFeedbackStatus,
  type FeedbackRequest,
} from './feedbackMocks';

const messages = defineMessages({
  feedbackName: { id: 'programs.feedback.table.feedback-name', defaultMessage: 'Feedback Name' },
  requestedBy: { id: 'programs.feedback.table.requested-by', defaultMessage: 'Requested By' },
  instructor: { id: 'programs.feedback.table.instructor', defaultMessage: 'Instructor' },
  trainee: { id: 'programs.feedback.table.trainee', defaultMessage: 'Trainee' },
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

  const match = value.match(/^([A-Za-z]{3} \d{2}, \d{4})/);
  if (match) {
    return match[1];
  }

  return value;
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

  return (
    <div className="feedback-table-wrapper">
      <table className="table feedback-table mb-0">
        <thead>
          <tr>
            <th>{intl.formatMessage(messages.feedbackName)}</th>
            <th>{intl.formatMessage(messages.requestedBy)}</th>
            <th>{intl.formatMessage(messages.instructor)}</th>
            <th>{intl.formatMessage(messages.trainee)}</th>
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
            const status = getFeedbackStatus(request);
            const badgeVariant = status === 'Completed' ? 'success' : status === 'Not Submitted' ? 'danger' : 'warning';

            return (
              <tr key={request.id}>
                <td className="feedback-table-feedback-name">{request.feedbackName}</td>
                <td>{request.requestedBy}</td>
                <td>{request.instructor}</td>
                <td>{request.trainee}</td>
                <td className="feedback-table-course">{request.course}</td>
                <td className="feedback-table-nowrap">{request.deadline}</td>
                <td className="feedback-table-nowrap">{formatTableDate(request.requestedOn)}</td>
                <td className="feedback-table-nowrap">{formatTableDate(request.submittedOn)}</td>
                <td className="feedback-table-nowrap">
                  <Badge variant={badgeVariant}>
                    {status === 'Completed'
                      ? intl.formatMessage(messages.completed)
                      : status === 'Not Submitted'
                        ? intl.formatMessage(messages.notSubmitted)
                        : intl.formatMessage(messages.pending)}
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
