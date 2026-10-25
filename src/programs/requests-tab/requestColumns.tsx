import React from 'react';
import { Link } from 'react-router-dom';
import type { IntlShape } from 'react-intl';
import { Button } from '@openedx/paragon';
import {
  formatDateTime, MobileRowCard, MobileRowCardsList, MobileRowField, RequestDetailCell,
} from '@edly-io/frontend-component-fbr';
import RequestActions, { type RequestActionHandlers } from './RequestActions';
import {
  AttachmentLink, CollapsibleText, EmptyValue, RequestStatusBadge, Submitter,
} from './RequestCells';
import type { AdminRequest } from './data/types';
import messages from './messages';

export interface RequestRowOptions extends RequestActionHandlers {
  programKey: string;
  /** The leaves tab shows the threshold and session-conflict flags under the submitter. */
  isLeaves: boolean;
  isRequestBusy: (request: AdminRequest) => boolean;
}

interface RowProps {
  row: { original: AdminRequest };
}

const auditLogPath = (request: AdminRequest) => `?view=audit-log&record_id=${request.id}`;

export const HistoryLink = ({ request, label }: { request: AdminRequest; label: string }) => (
  <Button as={Link} variant="outline-primary" size="sm" className="text-nowrap" to={auditLogPath(request)}>
    {label}
  </Button>
);

/** DataTable columns for the admin requests table. */
export const buildRequestColumns = (intl: IntlShape, options: RequestRowOptions) => [
  {
    Header: intl.formatMessage(messages.columnSubmitter),
    id: 'submitter',
    Cell: ({ row }: RowProps) => <Submitter request={row.original} showLeaveFlags={options.isLeaves} />,
  },
  {
    Header: intl.formatMessage(messages.columnDetail),
    id: 'detail',
    Cell: ({ row }: RowProps) => (
      <div className="requests-view__detail-cell">
        <RequestDetailCell req={row.original} programKey={options.programKey} />
      </div>
    ),
  },
  {
    Header: intl.formatMessage(messages.columnReason),
    accessor: 'reason',
    Cell: ({ value }: { value?: string }) => (
      <div className="requests-view__reason-cell"><CollapsibleText text={value} /></div>
    ),
  },
  {
    Header: intl.formatMessage(messages.status),
    accessor: 'state',
    Cell: ({ value }: { value: string }) => <RequestStatusBadge state={value} />,
  },
  {
    Header: intl.formatMessage(messages.columnSubmitted),
    accessor: 'created',
    Cell: ({ value }: { value?: string }) => <span className="text-nowrap">{formatDateTime(value)}</span>,
  },
  {
    Header: intl.formatMessage(messages.columnReviewerNote),
    accessor: 'reviewer_note',
    Cell: ({ value }: { value?: string }) => (value ? <CollapsibleText text={value} muted /> : <EmptyValue />),
  },
  {
    Header: intl.formatMessage(messages.columnAttachment),
    id: 'attachment',
    Cell: ({ row }: RowProps) => <AttachmentLink url={row.original.attachment} />,
  },
  {
    Header: intl.formatMessage(messages.columnAuditLog),
    id: 'audit-log',
    Cell: ({ row }: RowProps) => <HistoryLink request={row.original} label={intl.formatMessage(messages.history)} />,
  },
  {
    Header: intl.formatMessage(messages.columnActions),
    id: 'actions',
    Cell: ({ row }: RowProps) => (
      <RequestActions request={row.original} {...options} isBusy={options.isRequestBusy(row.original)} />
    ),
  },
];

interface RequestCardsProps {
  requests: AdminRequest[];
  options: RequestRowOptions;
  intl: IntlShape;
}

/** The same rows as cards, below the lg breakpoint. */
export const RequestCards = ({ requests, options, intl }: RequestCardsProps) => (
  <MobileRowCardsList>
    {requests.map((request) => (
      <MobileRowCard
        key={request.id}
        title={<RequestDetailCell req={request} programKey={options.programKey} />}
        subtitle={request.created ? formatDateTime(request.created) : null}
        footer={(
          <div className="d-flex flex-wrap w-100 justify-content-end requests-view__row-actions">
            <HistoryLink request={request} label={intl.formatMessage(messages.history)} />
            <RequestActions request={request} {...options} isBusy={options.isRequestBusy(request)} />
          </div>
        )}
      >
        {(request.submitter_name || request.submitter_email) && (
          <MobileRowField label={intl.formatMessage(messages.columnSubmitter)}>
            <Submitter request={request} showLeaveFlags={options.isLeaves} />
          </MobileRowField>
        )}
        <MobileRowField label={intl.formatMessage(messages.status)}>
          <RequestStatusBadge state={request.state} />
        </MobileRowField>
        {request.reason && (
          <MobileRowField label={intl.formatMessage(messages.columnReason)}>
            <CollapsibleText text={request.reason} />
          </MobileRowField>
        )}
        {request.reviewer_note && (
          <MobileRowField label={intl.formatMessage(messages.columnReviewerNote)}>
            <CollapsibleText text={request.reviewer_note} muted />
          </MobileRowField>
        )}
        {request.attachment && (
          <MobileRowField label={intl.formatMessage(messages.columnAttachment)}>
            <AttachmentLink url={request.attachment} />
          </MobileRowField>
        )}
      </MobileRowCard>
    ))}
  </MobileRowCardsList>
);
