/**
 * Domain types for the Program Result Management API — scheme endpoints only
 * (`/fbr/api/program-results/<program_key>/scheme/...`).
 *
 * Trainee-scores endpoints (GET/PUT/finalize) are out of scope for the Scheme
 * tab and belong to a separate Results tab; they are intentionally not
 * modeled here.
 */

export type SchemeStatus = 'draft' | 'published';

export interface SchemeSubsection {
  id: number;
  title: string;
  maxMarks: number;
  order: number;
}

export interface SchemeSection {
  id: number;
  title: string;
  order: number;
  /** Derived server-side = sum of this section's subsection maxMarks. Never sent on write. */
  total: number;
  subsections: SchemeSubsection[];
}

export interface Scheme {
  programKey: string;
  name: string;
  targetTotal: number;
  status: SchemeStatus;
  /** Derived server-side = sum of section totals. Never sent on write. */
  grandTotal: number;
  /** Derived server-side: targetTotal > 0 && grandTotal === targetTotal. Never sent on write. */
  isBalanced: boolean;
  sections: SchemeSection[];
}

export interface SaveSchemeSubsectionInput {
  title: string;
  maxMarks: number;
  order?: number;
}

export interface SaveSchemeSectionInput {
  title: string;
  order?: number;
  subsections?: SaveSchemeSubsectionInput[];
}

export interface SaveSchemeInput {
  /** Omit to keep the current name; send '' to blank it. */
  name?: string;
  targetTotal: number;
  sections: SaveSchemeSectionInput[];
}
