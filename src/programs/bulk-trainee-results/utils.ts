// Reused as-is so section colour-coding stays consistent with the Grade
// Scheme tab's preview — the *only* cross-feature import this module makes,
// since scheme lifecycle endpoints are explicitly unchanged by the new
// scoring API contract.
import { getSectionVariant } from '../grade-scheme-tab/utils';
import type { SaveScoreEntry, ScoringGridRow } from './data/types';
import type { EditableScoreCell, EditableScoringRow, EditableScoringSection } from './types';

export { getSectionVariant };

/** Keeps a marks-awarded value within the valid [0, maxMarks] range for its subsection. */
export const clampScore = (value: number, maxMarks: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), maxMarks);
};

/**
 * Builds the local editable draft for every row on the current grid page —
 * `draftScore` starts out equal to `savedScore`.
 */
export const buildEditableRows = (rows: ScoringGridRow[]): EditableScoringRow[] => rows.map((row) => ({
  username: row.username,
  fullName: row.fullName,
  avatar: row.avatar,
  enrollmentId: row.enrollmentId,
  rank: row.rank,
  status: row.status,
  targetTotal: row.targetTotal,
  sections: row.sections.map((section): EditableScoringSection => ({
    id: section.id,
    title: section.title,
    total: section.total,
    subsections: section.subsections.map((cell): EditableScoreCell => ({
      subsectionId: cell.subsectionId,
      title: cell.title,
      maxMarks: cell.maxMarks,
      savedScore: cell.score,
      draftScore: cell.score,
    })),
  })),
}));

export const isRowDirty = (row: EditableScoringRow): boolean => (
  row.sections.some((section) => section.subsections.some((cell) => cell.draftScore !== cell.savedScore))
);

/**
 * Rebuilds the local editable draft from a fresh server page while keeping
 * any in-flight, unsaved edits intact. Needed because saving or finalizing
 * one row invalidates the whole grid query (§3), which would otherwise wipe
 * out drafts the user hasn't saved yet on other rows of the same page.
 */
export const mergeEditableRows = (
  prevRows: EditableScoringRow[] | null,
  freshRows: EditableScoringRow[],
): EditableScoringRow[] => freshRows.map((freshRow) => {
  const prevRow = prevRows?.find((candidate) => candidate.username === freshRow.username);
  if (!prevRow) {
    return freshRow;
  }
  return {
    ...freshRow,
    sections: freshRow.sections.map((freshSection) => {
      const prevSection = prevRow.sections.find((candidate) => candidate.id === freshSection.id);
      return {
        ...freshSection,
        subsections: freshSection.subsections.map((freshCell) => {
          const prevCell = prevSection?.subsections.find(
            (candidate) => candidate.subsectionId === freshCell.subsectionId,
          );
          if (prevCell && prevCell.draftScore !== prevCell.savedScore) {
            return { ...freshCell, draftScore: prevCell.draftScore };
          }
          return freshCell;
        }),
      };
    }),
  };
});

/**
 * Only the changed cells, in the shape `PUT /trainees/scores/` expects
 * (§2.2) — unlisted subsections are left untouched server-side.
 */
export const getChangedScores = (row: EditableScoringRow): SaveScoreEntry[] => {
  const entries: SaveScoreEntry[] = [];
  row.sections.forEach((section) => section.subsections.forEach((cell) => {
    if (cell.draftScore !== cell.savedScore && cell.draftScore !== null) {
      entries.push({ subsectionId: cell.subsectionId, value: cell.draftScore });
    }
  }));
  return entries;
};

export const computeSectionScore = (section: EditableScoringSection): number => (
  section.subsections.reduce((sum, cell) => sum + (cell.draftScore ?? 0), 0)
);

export const computeRowTotal = (row: EditableScoringRow): number => (
  row.sections.reduce((sum, section) => sum + computeSectionScore(section), 0)
);

export const computeRowPercent = (row: EditableScoringRow): number => (
  row.targetTotal > 0 ? (computeRowTotal(row) / row.targetTotal) * 100 : 0
);

export const countScoredCells = (row: EditableScoringRow): number => (
  row.sections.reduce((sum, section) => sum + section.subsections.filter((cell) => cell.draftScore !== null).length, 0)
);

export const countTotalCells = (row: EditableScoringRow): number => (
  row.sections.reduce((sum, section) => sum + section.subsections.length, 0)
);

/**
 * Sections visible under the current Focus filter — `null` means "All". A
 * single-section focus narrows the grid to just that category's columns;
 * `sectionIndex` (the section's position in the *unfiltered* scheme) is kept
 * alongside each entry so colour-coding stays stable regardless of focus.
 */
export const getVisibleSectionIndexes = (
  sectionCount: number,
  focusSectionIndex: number | null,
): number[] => (
  focusSectionIndex === null
    ? Array.from({ length: sectionCount }, (_, index) => index)
    : [focusSectionIndex]
);

/**
 * Score inputs sharing a `data-score-column` (the subsection id — unique
 * across the whole scheme, so it doubles as a stable column key) that are
 * actually focusable right now, in the DOM/visual row order. Queried live
 * off the table rather than a ref map kept in sync by hand, so the result
 * is always correct after rows are added, removed, sorted, or filtered —
 * there's nothing to invalidate.
 */
const getFocusableColumnInputs = (
  table: HTMLTableElement,
  scoreColumn: string,
): HTMLInputElement[] => (
  Array.from(table.querySelectorAll<HTMLInputElement>('input[data-score-column]')).filter((input) => (
    input.dataset.scoreColumn === scoreColumn
    && !input.disabled
    && !input.readOnly
    && input.offsetParent !== null
  ))
);

/**
 * Enter-key navigation for the bulk-results score grid (wired up in
 * `BulkResultsGridRow`): moves focus to the next row's input in the same
 * column, wrapping back to the first row once the last row is passed. Tab
 * navigation is left entirely to the browser — this only ever runs for the
 * Enter key.
 *
 * Falls forward past any candidate that turns out not to be focusable
 * (e.g. it became disabled between render and click), wrapping if needed,
 * and is a no-op if the input is the only focusable one in its column.
 */
export const focusNextScoreInputInColumn = (currentInput: HTMLInputElement): void => {
  const { scoreColumn } = currentInput.dataset;
  const table = currentInput.closest('table');
  if (!scoreColumn || !table) {
    return;
  }

  const candidates = getFocusableColumnInputs(table, scoreColumn);
  const currentIndex = candidates.indexOf(currentInput);
  if (currentIndex === -1) {
    return;
  }

  for (let offset = 1; offset <= candidates.length; offset += 1) {
    const nextInput = candidates[(currentIndex + offset) % candidates.length];
    nextInput.focus();
    if (document.activeElement === nextInput) {
      return;
    }
  }
};
