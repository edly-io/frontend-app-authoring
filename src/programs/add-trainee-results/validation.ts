import type { EditableSectionScore } from './types';

/**
 * Framework/i18n-agnostic on purpose — the consuming component maps these
 * codes to localized messages, mirroring grade-scheme-tab/validation.ts.
 */
export type ResultValidationErrorCode = 'OUT_OF_RANGE';

export interface ResultValidationError {
  code: ResultValidationErrorCode;
  /** Present only for OUT_OF_RANGE, identifying the offending subsection(s). */
  subsectionIds?: number[];
}

export const validateResultDraft = (sections: EditableSectionScore[]): ResultValidationError[] => {
  const outOfRangeIds = sections
    .flatMap((section) => section.subsections)
    .filter((subsection) => subsection.marksAwarded < 0 || subsection.marksAwarded > subsection.maxMarks)
    .map((subsection) => subsection.subsectionId);
  return outOfRangeIds.length > 0 ? [{ code: 'OUT_OF_RANGE', subsectionIds: outOfRangeIds }] : [];
};

export const isFinalizable = (sections: EditableSectionScore[]): boolean => (
  validateResultDraft(sections).length === 0
);
