import React from 'react';
import { Button, Pagination } from '@openedx/paragon';
import { Tune } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { Scheme } from '../grade-scheme-tab/data/types';
import { GRID_NAME_COLUMN_WIDTH } from './constants';
import {
  countScoredCells, countTotalCells, getSectionVariant, getVisibleSectionIndexes,
} from './utils';
import BulkResultsGridRow from './BulkResultsGridRow';
import type { EditableScoringRow } from './types';

const messages = defineMessages({
  traineeColumn: { id: 'programs.bulk-trainee-results.grid.trainee-column', defaultMessage: 'Trainee' },
  statusColumn: { id: 'programs.bulk-trainee-results.grid.status-column', defaultMessage: 'Status' },
  actionsColumn: { id: 'programs.bulk-trainee-results.grid.actions-column', defaultMessage: 'Row' },
  totalColumn: { id: 'programs.bulk-trainee-results.grid.total-column', defaultMessage: 'Total' },
  noResults: { id: 'programs.bulk-trainee-results.grid.no-results', defaultMessage: 'No trainees match your search.' },
  paginationLabel: { id: 'programs.bulk-trainee-results.grid.pagination-label', defaultMessage: 'Trainee results pagination' },
  outOfMaxMarks: { id: 'programs.bulk-trainee-results.grid.out-of-max-marks', defaultMessage: 'Max marks: {maxMarks}' },
  fillColumnAlt: {
    id: 'programs.bulk-trainee-results.grid.fill-column-alt',
    defaultMessage: 'Fill {label} for every row on this page',
  },
  fillColumnBtn: { id: 'programs.bulk-trainee-results.grid.fill-column-btn', defaultMessage: 'Fill' },
  showingRange: {
    id: 'programs.bulk-trainee-results.grid.showing-range',
    defaultMessage: 'Showing {start}–{end} of {total}',
  },
  rowsPerPageLabel: { id: 'programs.bulk-trainee-results.grid.rows-per-page-label', defaultMessage: 'Rows per page ' },
});

interface BulkResultsGridProps {
  scheme: Scheme;
  rows: EditableScoringRow[];
  showTotals: boolean;
  canManage: boolean;
  canEditFinalized?: boolean;
  savingUsername: string | null;
  focusSectionIndex: number | null;
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  finalizeErrors?: Record<string, string>;
  onPageChange: (page: number) => void;
  onScoreChange: (username: string, subsectionId: number, value: number) => void;
  onSaveRow: (username: string) => void;
  onRequestFillColumn: (subsectionId: number, label: string, maxMarks: number) => void;
  onViewCourseScores: (username: string) => void;
}

const BulkResultsGrid: React.FC<BulkResultsGridProps> = ({
  scheme, rows, showTotals, canManage, canEditFinalized = false, savingUsername, focusSectionIndex,
  page, pageCount, rangeStart, rangeEnd, totalCount, finalizeErrors = {},
  onPageChange, onScoreChange, onSaveRow, onRequestFillColumn, onViewCourseScores,
}) => {
  const intl = useIntl();
  const visibleSectionIndexes = getVisibleSectionIndexes(scheme.sections.length, focusSectionIndex);

  return (
    <div>
      <div className="bulk-results-grid-wrapper">
        <table className="bulk-results-grid table mb-0">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="bulk-results-grid-sticky-col bulk-results-grid-name-col align-bottom"
                style={{ minWidth: GRID_NAME_COLUMN_WIDTH }}
              >
                {intl.formatMessage(messages.traineeColumn)}
              </th>
              {scheme.sections.map((section, index) => {
                if (!visibleSectionIndexes.includes(index)) {
                  return null;
                }
                return (
                  <th
                    key={section.id}
                    colSpan={section.subsections.length + (showTotals ? 1 : 0)}
                    className={`text-center bg-${getSectionVariant(index)}-100 text-${getSectionVariant(index)}-800`}
                  >
                    {section.title}
                    {' '}
                    <span className="text-muted d-block">
                      {intl.formatMessage(messages.outOfMaxMarks, { maxMarks: section.total })}
                    </span>
                  </th>
                );
              })}
              <th rowSpan={2} className="text-center align-bottom">{intl.formatMessage(messages.statusColumn)}</th>
              <th rowSpan={2} className="text-center align-bottom action-column">{intl.formatMessage(messages.actionsColumn)}</th>
            </tr>
            <tr>
              {scheme.sections.map((section, index) => {
                if (!visibleSectionIndexes.includes(index)) {
                  return null;
                }
                return (
                  <React.Fragment key={section.id}>
                    {section.subsections.map((subsection) => (
                      <th key={subsection.id} className="text-center small font-weight-normal text-nowrap">
                        <div className="d-flex align-items-center justify-content-center flex-column gap-1">
                          <span className="font-weight-bold text-truncate">
                            {subsection.title}
                          </span>
                          <span className="text-muted">
                            {intl.formatMessage(messages.outOfMaxMarks, { maxMarks: subsection.maxMarks })}
                          </span>
                          {canManage && (
                            <Button
                              iconBefore={Tune}
                              variant="outline-primary"
                              size="inline"
                              className="w-100 btn-fill"
                              aria-label={intl.formatMessage(messages.fillColumnAlt, { label: subsection.title })}
                              onClick={() => onRequestFillColumn(subsection.id, subsection.title, subsection.maxMarks)}
                            >
                              {intl.formatMessage(messages.fillColumnBtn)}
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    {showTotals && (
                      <th className={`text-center small text-nowrap bg-${getSectionVariant(index)}-100 text-${getSectionVariant(index)}-800`}>
                        {intl.formatMessage(messages.totalColumn)}
                      </th>
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <BulkResultsGridRow
                key={row.username}
                row={row}
                showTotals={showTotals}
                canManage={canManage}
                canEditFinalized={canEditFinalized}
                isSaving={savingUsername === row.username}
                scoredCells={countScoredCells(row)}
                totalCells={countTotalCells(row)}
                visibleSectionIndexes={visibleSectionIndexes}
                finalizeError={finalizeErrors[row.username]}
                onScoreChange={(subsectionId, value) => onScoreChange(row.username, subsectionId, value)}
                onSaveRow={() => onSaveRow(row.username)}
                onViewCourseScores={() => onViewCourseScores(row.username)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-muted text-center py-4 mb-0">{intl.formatMessage(messages.noResults)}</p>
      )}

      {rows.length > 0 && (
        <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-2">
          <span className="small text-muted">
            {intl.formatMessage(messages.showingRange, { start: rangeStart, end: rangeEnd, total: totalCount })}
          </span>
          <Pagination
            className="mx-auto"
            paginationLabel={intl.formatMessage(messages.paginationLabel)}
            pageCount={pageCount}
            currentPage={page}
            variant="secondary"
            onPageSelect={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default BulkResultsGrid;
