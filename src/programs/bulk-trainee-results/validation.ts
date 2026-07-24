import type { EditableScoringRow } from './types';

/**
 * Whether every subsection on this row has a draft score — mirrors the one
 * check Finalize performs server-side (§4: "Completeness → at Finalize").
 * Purely informational here (e.g. a "not ready" hint); Finalize itself is a
 * whole-cohort bulk action (§2.3) and doesn't gate on any single row.
 */
export const isRowFullyScored = (row: EditableScoringRow): boolean => (
  row.sections.every((section) => section.subsections.every((cell) => cell.draftScore !== null))
);
