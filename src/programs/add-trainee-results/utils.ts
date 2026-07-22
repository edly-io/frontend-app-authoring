import type { Scheme } from '../grade-scheme-tab/data/types';
// Reused as-is so the section colour-coding stays consistent between the
// Grade Scheme tab's preview and this page's summary/progress bars.
import { getSectionVariant } from '../grade-scheme-tab/utils';
import type { TraineeResult } from './data/types';
import type { EditableSectionScore, EditableSubsectionScore, EditableTraineeResult } from './types';

export { getSectionVariant };

/** Keeps a marks-awarded value within the valid [0, maxMarks] range for its line item. */
export const clampScore = (value: number, maxMarks: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), maxMarks);
};

const buildSubsectionScore = (
  subsection: Scheme['sections'][number]['subsections'][number],
  awardedById: Map<number, number>,
): EditableSubsectionScore => ({
  subsectionId: subsection.id,
  title: subsection.title,
  maxMarks: subsection.maxMarks,
  marksAwarded: awardedById.get(subsection.id) ?? 0,
});

const buildSectionScore = (
  section: Scheme['sections'][number],
  awardedById: Map<number, number>,
): EditableSectionScore => ({
  sectionId: section.id,
  title: section.title,
  maxMarks: section.total,
  subsections: section.subsections.map((subsection) => buildSubsectionScore(subsection, awardedById)),
});

/**
 * Builds the editable scoring draft by combining the published scheme's
 * criteria tree (source of truth for structure/max marks) with any
 * previously saved trainee scores (source of truth for marks awarded).
 * When `result` is null (no scores saved yet, e.g. a 404 from the API),
 * every line item starts at zero — the form is always the default view.
 */
export const buildEditableResult = (scheme: Scheme, result: TraineeResult | null): EditableTraineeResult => {
  const awardedById = new Map((result?.scores ?? []).map((score) => [score.subsectionId, score.marksAwarded]));
  return {
    status: result?.status ?? 'in_progress',
    sections: scheme.sections.map((section) => buildSectionScore(section, awardedById)),
  };
};

export const getSectionScoreTotal = (section: EditableSectionScore): number => (
  section.subsections.reduce((sum, subsection) => sum + subsection.marksAwarded, 0)
);

export const computeGrandScoreTotal = (sections: EditableSectionScore[]): number => (
  sections.reduce((sum, section) => sum + getSectionScoreTotal(section), 0)
);

export const formatPercentage = (awarded: number, max: number): number => (
  max > 0 ? Math.round((awarded / max) * 1000) / 10 : 0
);

/** Stable fingerprint of the awarded marks only, used to detect unsaved changes. */
export const getResultSignature = (sections: EditableSectionScore[]): string => JSON.stringify(
  sections.map((section) => section.subsections.map((subsection) => subsection.marksAwarded)),
);

export const toSaveTraineeResultInput = (sections: EditableSectionScore[]) => ({
  scores: sections.flatMap((section) => section.subsections.map((subsection) => ({
    subsectionId: subsection.subsectionId,
    marksAwarded: subsection.marksAwarded,
  }))),
});

/** Resets every line item's marks awarded to zero, leaving the scheme structure untouched. */
export const clearAllScores = (sections: EditableSectionScore[]): EditableSectionScore[] => (
  sections.map((section) => ({
    ...section,
    subsections: section.subsections.map((subsection) => ({ ...subsection, marksAwarded: 0 })),
  }))
);
