import React, { useMemo, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Col, DataTable, Form, Row, Spinner,
} from '@openedx/paragon';
import {
  extractApiError,
  MobileRowCard,
  MobileRowCardsList,
  MobileRowField,
  useIsBelowLg,
  useLeaveUsage,
  UserIdentity,
} from '@edly-io/frontend-component-fbr';
import { EMPTY_VALUE } from './RequestCells';
import type { LeaveUsage, LeaveUsageRow } from './data/types';
import messages from './messages';

const AT_RISK_FILTER = 'threshold_exceeded';
const TRAINEE_BADGE = 'Trainee';
const CENTERED = { cellClassName: 'text-center', headerClassName: 'justify-content-center' };

// The threshold is a property of the response, but each cell needs it, so it rides along on the row.
type UsageRow = LeaveUsageRow & { threshold: number };

interface UsageCellProps {
  row: { original: UsageRow };
}

const isOverThreshold = (row: UsageRow) => row.total_leaves_availed > row.threshold;

const NameCell = ({ row }: UsageCellProps) => (
  <div className={isOverThreshold(row.original) ? 'font-weight-bold' : undefined}>
    <UserIdentity name={row.original.full_name || row.original.username} badges={[TRAINEE_BADGE]} size="compact" />
  </div>
);

const EmailCell = ({ value }: { value?: string }) => <span className="text-muted">{value}</span>;

const LeavesUsedCell = ({ row }: UsageCellProps) => {
  const intl = useIntl();
  const { total_leaves_availed: used, threshold } = row.original;
  const overClass = isOverThreshold(row.original) ? ' requests-view__usage-count--over' : '';
  return (
    <>
      <div className={`requests-view__usage-count${overClass}`}>{used} / {threshold}</div>
      <progress
        className={`requests-view__usage-meter${isOverThreshold(row.original) ? ' requests-view__usage-meter--over' : ''}`}
        value={Math.min(used, threshold)}
        max={threshold || 1}
        aria-label={intl.formatMessage(messages.leavesUsedAria, { used, threshold })}
      />
    </>
  );
};

const fullDayCount = (row: UsageRow) => row.breakdown?.full_day_leaves ?? EMPTY_VALUE;
const sessionSpecificCount = (row: UsageRow) => row.breakdown?.session_specific_leaves ?? EMPTY_VALUE;

const UsageCards = ({ rows }: { rows: UsageRow[] }) => {
  const intl = useIntl();
  return (
    <MobileRowCardsList>
      {rows.map((usageRow) => {
        const row = { original: usageRow };
        return (
          <MobileRowCard
            key={usageRow.user_id ?? usageRow.email ?? usageRow.full_name}
            title={<NameCell row={row} />}
            subtitle={usageRow.email}
          >
            <MobileRowField label={intl.formatMessage(messages.leavesUsedField)}>
              <LeavesUsedCell row={row} />
            </MobileRowField>
            <MobileRowField label={intl.formatMessage(messages.columnFullDay)}>{fullDayCount(usageRow)}</MobileRowField>
            <MobileRowField label={intl.formatMessage(messages.columnSessionSpecific)}>
              {sessionSpecificCount(usageRow)}
            </MobileRowField>
          </MobileRowCard>
        );
      })}
    </MobileRowCardsList>
  );
};

/** Every trainee's leave usage against the program threshold, filterable to the at-risk ones. */
const LeaveUsagePanel = ({ programKey }: { programKey: string }) => {
  const intl = useIntl();
  const isBelowLg = useIsBelowLg();
  const [searchQ, setSearchQ] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const usageQuery = useLeaveUsage({
    program_key: programKey,
    ...(searchQ ? { q: searchQ } : {}),
    ...(riskFilter === AT_RISK_FILTER ? { threshold_exceeded: true } : {}),
  });
  const usage = usageQuery.data as LeaveUsage | undefined;

  const rows = useMemo<UsageRow[]>(
    () => (usage?.leaves ?? []).map((leave) => ({ ...leave, threshold: usage?.threshold ?? 0 })),
    [usage],
  );
  const columns = useMemo(() => [
    { Header: intl.formatMessage(messages.columnName), accessor: 'full_name', Cell: NameCell },
    { Header: intl.formatMessage(messages.columnEmail), accessor: 'email', Cell: EmailCell },
    {
      Header: intl.formatMessage(messages.columnLeavesUsed), accessor: 'total_leaves_availed', Cell: LeavesUsedCell,
    },
    {
      Header: intl.formatMessage(messages.columnFullDay),
      accessor: 'breakdown.full_day_leaves',
      Cell: ({ row }: UsageCellProps) => fullDayCount(row.original),
      ...CENTERED,
    },
    {
      Header: intl.formatMessage(messages.columnSessionSpecific),
      accessor: 'breakdown.session_specific_leaves',
      Cell: ({ row }: UsageCellProps) => sessionSpecificCount(row.original),
      ...CENTERED,
    },
  ], [intl]);

  return (
    <div>
      <h2 className="h3 requests-view__subheading">{intl.formatMessage(messages.leaveUsage)}</h2>

      <Row className="requests-filters align-items-end">
        <Col xs={12} sm={6} lg={4} className="mb-2">
          <Form.Label htmlFor="leave-usage-search" className="requests-filters__label">
            {intl.formatMessage(messages.searchLearners)}
          </Form.Label>
          <Form.Control
            id="leave-usage-search"
            type="text"
            value={searchQ}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQ(e.target.value)}
            placeholder={intl.formatMessage(messages.searchLearnersPlaceholder)}
          />
        </Col>
        {searchQ && (
          <Col xs="auto" className="mb-2">
            <Button variant="tertiary" size="sm" onClick={() => setSearchQ('')}>{intl.formatMessage(messages.clear)}</Button>
          </Col>
        )}
        <Col xs={12} sm={6} md={4} lg={3} className="mb-2">
          <Form.Label htmlFor="leave-usage-risk" className="requests-filters__label">
            {intl.formatMessage(messages.learnersFilter)}
          </Form.Label>
          <Form.Control
            id="leave-usage-risk"
            as="select"
            value={riskFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRiskFilter(e.target.value)}
          >
            <option value="">{intl.formatMessage(messages.allLearners)}</option>
            <option value={AT_RISK_FILTER}>{intl.formatMessage(messages.atRiskLearners)}</option>
          </Form.Control>
        </Col>
      </Row>

      {usageQuery.isPending && (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.loadingUsage)} />
        </div>
      )}
      {usageQuery.isError && (
        <Alert variant="danger">{extractApiError(usageQuery.error, intl.formatMessage(messages.loadUsageError))}</Alert>
      )}
      {usageQuery.isSuccess && (
        <DataTable isSortable data={rows} columns={columns} itemCount={rows.length}>
          {!isBelowLg && (
            <div className="sticky-header-table sessions-table-scroll">
              <DataTable.Table />
              <DataTable.EmptyTable content={intl.formatMessage(messages.noLearners)} />
            </div>
          )}
          {isBelowLg && rows.length > 0 && <UsageCards rows={rows} />}
        </DataTable>
      )}
    </div>
  );
};

export default LeaveUsagePanel;
