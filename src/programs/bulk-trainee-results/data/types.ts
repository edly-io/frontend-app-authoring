/**
 * Types for the Program Results **Scoring Grid** API — see
 * `program-results-scoring-api.md`. This is a standalone contract: it
 * supersedes the per-username scoring routes previously mocked under
 * `add-trainee-results/data`, so nothing here is imported from that folder.
 * The only thing still shared with the rest of Program Result Management is
 * the published grading `Scheme` (`../../grade-scheme-tab/data/types`), whose
 * lifecycle endpoints the API doc explicitly calls out as unchanged.
 */

export type ScoringStatus = 'in_progress' | 'finalized';

/** Provisional until a row is finalized — an unscored row always reads `fail` / `percent: 0`. */
export type ScoringResult = 'pass' | 'fail';

export type ScoreRangeFilter = '85_and_above' | '70_84' | '60_69' | '50_59' | 'below_50';

/** One scored subsection cell. `score: null` means "not entered" — distinct from a real, deliberate `0`. */
export interface ScoreCell {
  subsectionId: number;
  title: string;
  maxMarks: number;
  score: number | null;
}

export interface ScoringSection {
  id: number;
  title: string;
  /** Section max, e.g. "Exams / 400" — comes from the published scheme. */
  total: number;
  /** Section subtotal for this trainee, as returned by the grid GET. */
  score: number;
  subsections: ScoreCell[];
}

/** One cohort row from `GET /trainees/scores/` (§2.1). */
export interface ScoringGridRow {
  username: string;
  fullName: string;
  avatar: string | null;
  /**
   * Display-only enrollment id (e.g. `STP-50-001`). §5 "Open" flags that the
   * current row shape has no enrollment id — FE decides / BE may add one.
   * Mock-only for now; drop this once the real field lands.
   */
  enrollmentId: string;
  rank: number;
  total: number;
  targetTotal: number;
  percent: number;
  result: ScoringResult;
  status: ScoringStatus;
  sections: ScoringSection[];
}

export interface ScoringGridParams {
  search?: string;
  scoreRange?: ScoreRangeFilter;
  status?: ScoringStatus;
  page?: number;
  pageSize?: number;
}

/** Flat pagination shape used by the grid GET (§2.1) — not the `results/count/numPages` shape used elsewhere. */
export interface ScoringGridResponse {
  count: number;
  numPages: number;
  currentPage: number;
  next: number | null;
  previous: number | null;
  start: number;
  results: ScoringGridRow[];
}

export interface SaveScoreEntry {
  subsectionId: number;
  value: number;
}

export interface SaveScoresTraineeInput {
  username: string;
  scores: SaveScoreEntry[];
}

/** Request body for `PUT /trainees/scores/` (§2.2) — 1-100 trainees, no duplicates. */
export interface SaveScoresInput {
  trainees: SaveScoresTraineeInput[];
}

/** Request body for `POST /trainees/scores/finalize/` (§2.3) — omit/empty `usernames` to target the whole cohort. */
export interface FinalizeScoresInput {
  usernames?: string[];
}

export type SaveScoreErrorCode = 'not_enrolled' | 'finalized' | 'invalid_score';
export type FinalizeErrorCode = 'not_fully_scored' | 'not_enrolled';

export interface WriteEnvelopeError<TCode extends string> {
  username: string;
  code: TCode;
  detail: string;
}

/**
 * The one write-response shape shared by Save and Finalize (§3): 200 does
 * not mean "all succeeded" — inspect `errors`.
 */
export interface WriteEnvelope<TCode extends string> {
  ok: string[];
  errors: WriteEnvelopeError<TCode>[];
}

export type SaveScoresResponse = WriteEnvelope<SaveScoreErrorCode>;
export type FinalizeScoresResponse = WriteEnvelope<FinalizeErrorCode>;
