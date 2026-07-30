import React from 'react';
import {
  Button, Form, Icon, Spinner,
} from '@openedx/paragon';
import { Search } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

export type StatusFilter = 'all' | 'awarded' | 'notAwarded';

interface CertificateRosterToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAward: () => void;
  isBulkAwarding: boolean;
  isBulkAwardDisabled: boolean;
}

const CertificateRosterToolbar: React.FC<CertificateRosterToolbarProps> = ({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  selectedCount,
  onClearSelection,
  onBulkAward,
  isBulkAwarding,
  isBulkAwardDisabled,
}) => {
  const intl = useIntl();

  return (
    <div className="d-flex flex-wrap align-items-end gap-2 p-3 border-bottom">
      <Form.Group className="mb-0 certificate-search">
        <Form.Control
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
          aria-label={intl.formatMessage(messages.searchLabel)}
          leadingElement={<Icon src={Search} className="text-gray-500" />}
        />
      </Form.Group>
      <Form.Group className="mb-0">
        <Form.Control
          as="select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          aria-label={intl.formatMessage(messages.colStatus)}
        >
          <option value="all">{intl.formatMessage(messages.filterAll)}</option>
          <option value="awarded">{intl.formatMessage(messages.filterAwarded)}</option>
          <option value="notAwarded">{intl.formatMessage(messages.filterNotAwarded)}</option>
        </Form.Control>
      </Form.Group>
      {selectedCount > 0 && (
        <div className="d-flex align-items-center gap-2 ml-auto">
          <span className="small font-weight-bold">
            {intl.formatMessage(messages.selectedCount, { count: selectedCount })}
          </span>
          <Button variant="tertiary" size="sm" onClick={onClearSelection}>
            {intl.formatMessage(messages.clearSelection)}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onBulkAward}
            disabled={isBulkAwardDisabled}
          >
            {isBulkAwarding ? (
              <Spinner
                animation="border"
                size="sm"
                screenReaderText={intl.formatMessage(messages.awardSelected)}
              />
            ) : intl.formatMessage(messages.awardSelected)}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CertificateRosterToolbar;
