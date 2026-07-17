import React from 'react';
import {
  Badge,
  DataTable,
  Icon,
  IconButtonWithTooltip,
} from '@openedx/paragon';
import { RemoveRedEye as ViewIcon } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import UserIdentity from '../../components/UserIdentity';
import type {
  FeedbackRequest,
  FeedbackRequestStatus,
} from '../data/types';

const messages = defineMessages({
  feedbackName: { id: 'programs.feedback.table.feedback-name', defaultMessage: 'Feedback Name' },
  requestedBy: { id: 'programs.feedback.table.requested-by', defaultMessage: 'Requested By' },
  subject: { id: 'programs.feedback.table.subject', defaultMessage: 'Feedback About' },
  reviewer: { id: 'programs.feedback.table.reviewer', defaultMessage: 'Requested From' },
  deadline: { id: 'programs.feedback.table.deadline', defaultMessage: 'Deadline' },
  requestedOn: { id: 'programs.feedback.table.requested-on', defaultMessage: 'Requested On' },
  submittedOn: { id: 'programs.feedback.table.submitted-on', defaultMessage: 'Submitted On' },
  status: { id: 'programs.feedback.table.status', defaultMessage: 'Status' },
  actions: { id: 'programs.feedback.table.actions', defaultMessage: 'Actions' },
  pending: { id: 'programs.feedback.table.status.pending', defaultMessage: 'Pending' },
  completed: { id: 'programs.feedback.table.status.completed', defaultMessage: 'Completed' },
  notSubmitted: { id: 'programs.feedback.table.status.not-submitted', defaultMessage: 'Not Submitted' },
  generalFeedback: { id: 'programs.feedback.table.subject.general', defaultMessage: 'General feedback' },
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

interface FeedbackPersonCellProps {
  name?: string | null;
  roles?: string[] | null;
  avatar?: string | null;
  emptyLabel?: string;
}

const FeedbackPersonCell: React.FC<FeedbackPersonCellProps> = ({
  name,
  roles,
  avatar,
  emptyLabel = '--',
}) => {
  if (!name) {
    return <span className="text-muted">{emptyLabel}</span>;
  }

  return (
    <UserIdentity
      name={name}
      badges={roles ?? []}
      avatarValue={avatar ?? ''}
      size="compact"
    />
  );
};

interface FeedbackRequestsTableProps {
  requests: FeedbackRequest[];
  onViewResponse: (request: FeedbackRequest) => void;
}

interface FeedbackRequestTableRow extends FeedbackRequest {
  deadlineLabel: string;
  createdLabel: string;
  submittedAtLabel: string;
  generalFeedbackLabel: string;
  statusLabel: string;
  viewResponseLabel: string;
  onViewResponse: (request: FeedbackRequest) => void;
}

interface FeedbackRequestCellProps {
  row: {
    original: FeedbackRequestTableRow;
  };
}

const RequestedByCell: React.FC<FeedbackRequestCellProps> = ({ row }) => (
  <FeedbackPersonCell
    name={row.original.requestedByName}
    roles={row.original.requestedByRoles ?? (row.original.requestedByRole ? [row.original.requestedByRole] : [])}
    avatar={row.original.requestedByAvatar}
  />
);

const SubjectCell: React.FC<FeedbackRequestCellProps> = ({ row }) => (
  <FeedbackPersonCell
    name={row.original.subjectName}
    roles={row.original.subjectRoles ?? (row.original.subjectRole ? [row.original.subjectRole] : [])}
    avatar={row.original.subjectAvatar}
    emptyLabel={row.original.generalFeedbackLabel}
  />
);

const ReviewerCell: React.FC<FeedbackRequestCellProps> = ({ row }) => (
  <FeedbackPersonCell
    name={row.original.reviewerName}
    roles={row.original.reviewerRoles ?? (row.original.reviewerRole ? [row.original.reviewerRole] : [])}
    avatar={row.original.reviewerAvatar}
  />
);

const DeadlineCell: React.FC<FeedbackRequestCellProps> = ({ row }) => <span>{row.original.deadlineLabel}</span>;

const CreatedCell: React.FC<FeedbackRequestCellProps> = ({ row }) => <span>{row.original.createdLabel}</span>;

const SubmittedAtCell: React.FC<FeedbackRequestCellProps> = ({ row }) => <span>{row.original.submittedAtLabel}</span>;

const StatusCell: React.FC<FeedbackRequestCellProps> = ({ row }) => {
  const { status } = row.original;
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {row.original.statusLabel}
    </Badge>
  );
};

const ActionCell: React.FC<FeedbackRequestCellProps> = ({ row }) => {
  const request = row.original;
  return (
    <div className="feedback-table-action">
      {request.status === 'Completed' ? (
        <IconButtonWithTooltip
          tooltipContent={request.viewResponseLabel}
          src={ViewIcon}
          onClick={() => request.onViewResponse(request)}
          alt={request.viewResponseLabel}
        />
      ) : (
        <span className="feedback-table-action-placeholder text-muted" aria-hidden="true">
          <Icon src={ViewIcon} />
        </span>
      )}
    </div>
  );
};

const FeedbackRequestsTable: React.FC<FeedbackRequestsTableProps> = ({
  requests,
  onViewResponse,
}) => {
  const intl = useIntl();
  const statusLabelByStatus = React.useMemo<Record<FeedbackRequestStatus, string>>(
    () => ({
      Completed: intl.formatMessage(messages.completed),
      'Not Submitted': intl.formatMessage(messages.notSubmitted),
      Pending: intl.formatMessage(messages.pending),
    }),
    [intl],
  );
  const tableData = React.useMemo<FeedbackRequestTableRow[]>(
    () => requests.map((request) => ({
      ...request,
      deadlineLabel: formatTableDate(request.deadline),
      createdLabel: formatTableDate(request.created),
      submittedAtLabel: formatTableDate(request.submittedAt),
      generalFeedbackLabel: intl.formatMessage(messages.generalFeedback),
      statusLabel: statusLabelByStatus[request.status],
      viewResponseLabel: intl.formatMessage(messages.viewResponse),
      onViewResponse,
    })),
    [intl, onViewResponse, requests, statusLabelByStatus],
  );
  const columns = React.useMemo(
    () => [
      {
        Header: intl.formatMessage(messages.feedbackName),
        accessor: 'feedbackName',
        cellClassName: 'feedback-table-feedback-name',
      },
      {
        Header: intl.formatMessage(messages.requestedBy),
        accessor: 'requestedByName',
        cellClassName: 'feedback-table-person',
        Cell: RequestedByCell,
      },
      {
        Header: intl.formatMessage(messages.subject),
        accessor: 'subjectName',
        cellClassName: 'feedback-table-person',
        Cell: SubjectCell,
      },
      {
        Header: intl.formatMessage(messages.reviewer),
        accessor: 'reviewerName',
        cellClassName: 'feedback-table-person',
        Cell: ReviewerCell,
      },
      {
        Header: intl.formatMessage(messages.deadline),
        accessor: 'deadlineLabel',
        cellClassName: 'feedback-table-nowrap',
        headerClassName: 'feedback-table-nowrap',
        Cell: DeadlineCell,
      },
      {
        Header: intl.formatMessage(messages.requestedOn),
        accessor: 'createdLabel',
        cellClassName: 'feedback-table-nowrap',
        headerClassName: 'feedback-table-nowrap',
        Cell: CreatedCell,
      },
      {
        Header: intl.formatMessage(messages.submittedOn),
        accessor: 'submittedAtLabel',
        cellClassName: 'feedback-table-nowrap',
        headerClassName: 'feedback-table-nowrap',
        Cell: SubmittedAtCell,
      },
      {
        Header: intl.formatMessage(messages.status),
        accessor: 'status',
        cellClassName: 'feedback-table-nowrap',
        headerClassName: 'feedback-table-nowrap',
        Cell: StatusCell,
      },
      {
        id: 'actions',
        Header: intl.formatMessage(messages.actions),
        cellClassName: 'feedback-table-nowrap',
        headerClassName: 'feedback-table-nowrap',
        Cell: ActionCell,
      },
    ],
    [intl],
  );

  return (
    <div className="feedback-table-wrapper">
      <DataTable
        disableElevation
        data={tableData}
        itemCount={tableData.length}
        columns={columns}
      >
        <DataTable.Table />
      </DataTable>
    </div>
  );
};

export default FeedbackRequestsTable;
