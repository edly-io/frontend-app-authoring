import React from 'react';
import {
  Badge, Form, Icon, IconButtonWithTooltip, StatefulButton,
} from '@openedx/paragon';
import { Lock, RemoveRedEye, Save } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import UserIdentity from '../../components/UserIdentity';
import { GRID_SCORE_CELL_WIDTH } from './constants';
import {
  computeSectionScore, focusNextScoreInputInColumn, getSectionVariant, isRowDirty,
} from './utils';
import type { EditableScoringRow } from './types';

const messages = defineMessages({
  statusInProgress: { id: 'programs.bulk-trainee-results.grid.status.in-progress', defaultMessage: 'In progress' },
  statusFinalized: { id: 'programs.bulk-trainee-results.grid.status.finalized', defaultMessage: 'Finalized' },
  scoreInputAria: {
    id: 'programs.bulk-trainee-results.grid.score-input-aria',
    defaultMessage: 'Score for {name} — {label}',
  },
  saveRowBtn: { id: 'programs.bulk-trainee-results.grid.save-row-btn', defaultMessage: 'Save' },
  saveRowBtnPending: { id: 'programs.bulk-trainee-results.grid.save-row-btn-pending', defaultMessage: 'Saving…' },
  savedLabel: { id: 'programs.bulk-trainee-results.grid.saved-label', defaultMessage: 'Saved' },
  unsavedLabel: { id: 'programs.bulk-trainee-results.grid.unsaved-label', defaultMessage: 'Unsaved' },
  cellsScored: { id: 'programs.bulk-trainee-results.grid.cells-scored', defaultMessage: '{scored}/{total} filled' },
  finalizedEditableHint: {
    id: 'programs.bulk-trainee-results.grid.finalized-editable-hint',
    defaultMessage: 'Editable (Super Admin)',
  },
  viewCourseScoresBtn: {
    id: 'programs.bulk-trainee-results.grid.view-course-scores-btn',
    defaultMessage: 'View course score',
  },
});

interface BulkResultsGridRowProps {
  row: EditableScoringRow;
  showTotals: boolean;
  canManage: boolean;
  canEditFinalized?: boolean;
  isSaving: boolean;
  scoredCells: number;
  totalCells: number;
  visibleSectionIndexes: number[];
  finalizeError?: string;
  onScoreChange: (subsectionId: number, value: number) => void;
  onSaveRow: () => void;
  onViewCourseScores: () => void;
}

const BulkResultsGridRow: React.FC<BulkResultsGridRowProps> = ({
  row, showTotals, canManage, canEditFinalized = false, isSaving, scoredCells, totalCells,
  visibleSectionIndexes, finalizeError, onScoreChange, onSaveRow, onViewCourseScores,
}) => {
  const intl = useIntl();
  const isFinalized = row.status === 'finalized';
  const canEditRow = canManage && (!isFinalized || canEditFinalized);
  const dirty = isRowDirty(row);
  const hasFinalizeError = !!finalizeError;
  let stickyColStateClass = 'saved';
  if (hasFinalizeError) {
    stickyColStateClass = 'has-error';
  } else if (dirty) {
    stickyColStateClass = 'unsaved';
  }

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>, cell: any) => {
    const value = Math.min(Math.max(Number(e.target.value) || 0, 0), cell.maxMarks);
    onScoreChange(cell.subsectionId, value);
  };

  // Enter moves to the next row's input in the same column (wrapping past
  // the last row); Tab is left untouched since we only handle 'Enter' here.
  const handleScoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }
    e.preventDefault();
    focusNextScoreInputInColumn(e.currentTarget);
  };

  return (
    <tr className={`bulk-results-grid-row ${hasFinalizeError ? 'has-error' : ''}`}>
      <td className={`bulk-results-grid-sticky-col bulk-results-grid-name-col ${stickyColStateClass}`}>
        <div className="d-flex align-items-center gap-2">
          <UserIdentity
            name={row.fullName}
            badges={['Trainee']}
            avatarValue={row.avatar ?? ''}
            size="compact"
            enableHoverCard
          />
        </div>
        {finalizeError && (
          <div className="bulk-results-grid-row-error small mt-1">{finalizeError}</div>
        )}
      </td>

      {row.sections.map((section, sectionIndex) => {
        if (!visibleSectionIndexes.includes(sectionIndex)) {
          return null;
        }
        const variant = getSectionVariant(sectionIndex);
        const sectionTotal = computeSectionScore(section);
        return (
          <React.Fragment key={section.id}>
            {section.subsections.map((cell) => (
              <td key={cell.subsectionId} className="text-center">
                <div className="form-cell d-flex align-items-center justify-content-center gap-1">
                  <Form.Group size="sm">
                    <Form.Control
                      size="sm"
                      type="number"
                      min={0}
                      max={cell.maxMarks}
                      value={cell.draftScore ?? ''}
                      placeholder="–"
                      disabled={!canEditRow}
                      onChange={(e) => handleScoreChange(e, cell)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={handleScoreKeyDown}
                      data-score-column={cell.subsectionId}
                      style={{ width: GRID_SCORE_CELL_WIDTH }}
                      className="mr-0"
                      aria-label={intl.formatMessage(messages.scoreInputAria, {
                        name: row.fullName,
                        label: cell.title,
                      })}
                    />
                  </Form.Group>
                </div>
              </td>
            ))}
            {showTotals && (
              <td className={`text-center font-weight-bold text-${variant}-800 bg-${variant}-100`}>
                {sectionTotal}
                <span className="text-muted font-weight-normal"> / {section.total}</span>
              </td>
            )}
          </React.Fragment>
        );
      })}

      <td className="text-center text-nowrap">
        <Badge variant={isFinalized ? 'success' : 'secondary'} className="d-inline-flex align-items-center gap-1">
          {isFinalized && <Icon src={Lock} size="xs" />}
          {intl.formatMessage(isFinalized ? messages.statusFinalized : messages.statusInProgress)}
        </Badge>
        {isFinalized && canEditRow && (
          <div className="small text-warning-800 mt-1">
            {intl.formatMessage(messages.finalizedEditableHint)}
          </div>
        )}
        <div className="small text-muted mt-1">
          {intl.formatMessage(messages.cellsScored, { scored: scoredCells, total: totalCells })}
        </div>
      </td>

      <td className="text-center text-nowrap action-column">
        <div className="d-flex flex-column align-items-center gap-1">
          <span className={`small ${dirty ? 'text-warning-800' : 'text-success-800'}`}>
            {intl.formatMessage(dirty ? messages.unsavedLabel : messages.savedLabel)}
          </span>
          <div className="d-flex align-items-center gap-2">
            {canEditRow && (
              <StatefulButton
                variant="outline-primary"
                size="sm"
                iconBefore={Save}
                state={isSaving ? 'pending' : 'default'}
                disabledStates={['pending']}
                disabled={!dirty}
                labels={{
                  default: intl.formatMessage(messages.saveRowBtn),
                  pending: intl.formatMessage(messages.saveRowBtnPending),
                }}
                onClick={onSaveRow}
              />
            )}
            <IconButtonWithTooltip
              tooltipContent={intl.formatMessage(messages.viewCourseScoresBtn)}
              src={RemoveRedEye}
              onClick={onViewCourseScores}
              alt={intl.formatMessage(messages.viewCourseScoresBtn)}
            />
          </div>
        </div>
      </td>
    </tr>
  );
};

export default BulkResultsGridRow;
