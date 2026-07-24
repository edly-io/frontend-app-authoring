/**
 * Component-layer (editor draft) types for the Scoring Grid.
 *
 * Per `program-results-scoring-api.md` §1, there is **no draft layer on the
 * backend** — a saved score is a real, persisted, editable value. `draftScore`
 * below is purely a client-side edit buffer (mirrors `savedScore` until the
 * user types); Save (`PUT`) is the only thing that ever writes it back.
 */

import type { ScoringStatus } from './data/types';

export interface EditableScoreCell {
  subsectionId: number;
  title: string;
  maxMarks: number;
  /** Last known server value. `null` = not yet entered — distinct from a real `0`. */
  savedScore: number | null;
  /** Local edit buffer; equals `savedScore` until the user changes it. */
  draftScore: number | null;
}

export interface EditableScoringSection {
  id: number;
  title: string;
  total: number;
  subsections: EditableScoreCell[];
}

export interface EditableScoringRow {
  username: string;
  fullName: string;
  enrollmentId: string;
  avatar: string | null;
  rank: number;
  status: ScoringStatus;
  targetTotal: number;
  sections: EditableScoringSection[];
}
