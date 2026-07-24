import React from 'react';
import {
  Form, Stack,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Scheme } from '../grade-scheme-tab/data/types';
import type { ScoringStatus } from './data/types';
import DebouncedSearchField from '../feedback-tab/DebouncedSearchField';
import { getSectionVariant } from './utils';

const messages = defineMessages({
  searchPlaceholder: { id: 'programs.bulk-trainee-results.toolbar.search-placeholder', defaultMessage: 'Search trainees...' },
  showTotalsLabel: { id: 'programs.bulk-trainee-results.toolbar.show-totals', defaultMessage: 'Show section totals' },
  statusFilterAria: { id: 'programs.bulk-trainee-results.toolbar.status-filter-aria', defaultMessage: 'Filter by status' },
  statusFilterAll: { id: 'programs.bulk-trainee-results.toolbar.status-filter-all', defaultMessage: 'All statuses' },
  statusFilterInProgress: { id: 'programs.bulk-trainee-results.toolbar.status-filter-in-progress', defaultMessage: 'In progress' },
  statusFilterFinalized: { id: 'programs.bulk-trainee-results.toolbar.status-filter-finalized', defaultMessage: 'Finalized' },
  focusLabel: { id: 'programs.bulk-trainee-results.toolbar.focus-label', defaultMessage: 'Focus' },
  focusGroupAria: { id: 'programs.bulk-trainee-results.toolbar.focus-group-aria', defaultMessage: 'Focus the grid on one category' },
  focusAll: { id: 'programs.bulk-trainee-results.toolbar.focus-all', defaultMessage: 'All categories' },
});

const NO_FILTER = 'all';

interface BulkResultsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: ScoringStatus | undefined;
  onStatusChange: (status: ScoringStatus | undefined) => void;
  showTotals: boolean;
  onShowTotalsChange: (showTotals: boolean) => void;
  scheme: Scheme;
  focusSectionIndex: number | null;
  onFocusSectionChange: (index: number | null) => void;
}

const BulkResultsToolbar: React.FC<BulkResultsToolbarProps> = ({
  search, onSearchChange, status, onStatusChange, showTotals, onShowTotalsChange,
  scheme, focusSectionIndex, onFocusSectionChange,
}) => {
  const intl = useIntl();

  return (
    <Stack gap={3} className="mb-3">
      <Stack direction="horizontal" gap={3} className="flex-wrap align-items-center justify-content-between">
        <Stack direction="horizontal" gap={3} className="flex-wrap align-items-center flex-grow-1">
          <div style={{ maxWidth: 320 }} className="flex-grow-1">
            <DebouncedSearchField
              value={search}
              onSearch={onSearchChange}
              placeholder={intl.formatMessage(messages.searchPlaceholder)}
            />
          </div>

          <Form.Control
            as="select"
            value={status ?? NO_FILTER}
            onChange={(e) => onStatusChange(e.target.value === NO_FILTER ? undefined : e.target.value as ScoringStatus)}
            aria-label={intl.formatMessage(messages.statusFilterAria)}
            style={{ maxWidth: 180 }}
          >
            <option value={NO_FILTER}>{intl.formatMessage(messages.statusFilterAll)}</option>
            <option value="in_progress">{intl.formatMessage(messages.statusFilterInProgress)}</option>
            <option value="finalized">{intl.formatMessage(messages.statusFilterFinalized)}</option>
          </Form.Control>
        </Stack>

        <Form.Switch
          checked={showTotals}
          onChange={(e) => onShowTotalsChange(e.target.checked)}
          className="text-nowrap mb-0"
        >
          {intl.formatMessage(messages.showTotalsLabel)}
        </Form.Switch>
      </Stack>

      <div className="bulk-results-focus-filter">
        <span className="bulk-results-focus-filter-label">{intl.formatMessage(messages.focusLabel)}</span>
        <div
          className="bulk-results-focus-filter-group"
          role="group"
          aria-label={intl.formatMessage(messages.focusGroupAria)}
        >
          <button
            type="button"
            className={`bulk-results-focus-filter-btn ${focusSectionIndex === null ? 'active' : ''}`}
            aria-pressed={focusSectionIndex === null}
            onClick={() => onFocusSectionChange(null)}
          >
            {intl.formatMessage(messages.focusAll)}
          </button>
          {scheme.sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={`bulk-results-focus-filter-btn ${focusSectionIndex === index ? 'active' : ''}`}
              aria-pressed={focusSectionIndex === index}
              onClick={() => onFocusSectionChange(index)}
            >
              <span className={`bulk-results-focus-filter-swatch bg-${getSectionVariant(index)}-800`} aria-hidden="true" />
              {section.title}
            </button>
          ))}
        </div>
      </div>
    </Stack>
  );
};

export default BulkResultsToolbar;
