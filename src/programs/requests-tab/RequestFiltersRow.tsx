import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Col, Form, Row } from '@openedx/paragon';
import { REQUEST_STATUS_LABELS } from '@edly-io/frontend-component-fbr';
import DateRangeFilter from './DateRangeFilter';
import type { RequestFilters } from './data/types';
import messages from './messages';

interface RequestFiltersRowProps {
  filters: RequestFilters;
  onChange: (filters: RequestFilters) => void;
}

const RequestFiltersRow = ({ filters, onChange }: RequestFiltersRowProps) => {
  const intl = useIntl();
  const update = (changes: RequestFilters) => onChange({ ...filters, ...changes });
  return (
    <Row className="requests-filters align-items-end">
      <Col xs={12} sm={6} lg={3} className="mb-2">
        <Form.Label htmlFor="admin-requests-search" className="requests-filters__label">
          {intl.formatMessage(messages.search)}
        </Form.Label>
        <Form.Control
          id="admin-requests-search"
          type="text"
          value={filters.q ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ q: e.target.value })}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
      </Col>
      <Col xs={12} sm={6} md={3} lg={2} className="mb-2">
        <Form.Label htmlFor="admin-requests-status" className="requests-filters__label">
          {intl.formatMessage(messages.status)}
        </Form.Label>
        <Form.Control
          id="admin-requests-status"
          as="select"
          value={filters.state ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update({ state: e.target.value })}
        >
          <option value="">{intl.formatMessage(messages.allStatuses)}</option>
          {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Form.Control>
      </Col>
      <Col xs={12} sm="auto" className="mb-2">
        <DateRangeFilter
          idPrefix="admin-requests"
          label={intl.formatMessage(messages.submissionDate)}
          from={filters.start_date ?? ''}
          to={filters.end_date ?? ''}
          onChange={({ from, to }) => update({ start_date: from, end_date: to })}
        />
      </Col>
    </Row>
  );
};

export default RequestFiltersRow;
