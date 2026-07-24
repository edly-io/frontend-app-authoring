/**
 * Initial page size for the scoring grid — smaller than the API's
 * documented default (50, §2.1) so pagination is visible with a small mock
 * cohort; wire up to the real default once a full cohort is behind this
 * endpoint.
 */
export const SCORING_GRID_PAGE_SIZE = 25;

/** Choices for the grid's "Rows per page" selector. */

export const GRID_SCORE_CELL_WIDTH = 65;

export const GRID_NAME_COLUMN_WIDTH = 240;

/**
 * Client-side-only pass mark used to label the live (pre-finalize) total in
 * the row detail panel. The API's `result` field (§2.4) is the authoritative
 * pass/fail and is only meaningful once finalized — this constant exists
 * purely so the expanded row can show a provisional "Below pass mark" hint
 * while the trainee is still being scored.
 */
export const PROVISIONAL_PASSING_PERCENT = 40;
