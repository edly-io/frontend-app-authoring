import { computeGrandTotal, isSchemeBalanced } from './utils';
import type { EditableScheme } from './types';

/**
 * Mirrors the server's publish preconditions (see API contract §4) so the UI
 * can disable/explain the Publish action before making a request that would
 * otherwise fail with 400. Framework/i18n-agnostic on purpose — the
 * consuming component maps these codes to localized messages.
 */
export type SchemeValidationErrorCode = 'NO_SECTIONS' | 'EMPTY_SECTION' | 'UNBALANCED';

export interface SchemeValidationError {
  code: SchemeValidationErrorCode;
  /** Present only for EMPTY_SECTION, identifying the offending section(s). */
  sectionLocalIds?: string[];
}

export const validateSchemeDraft = (draft: EditableScheme): SchemeValidationError[] => {
  const errors: SchemeValidationError[] = [];

  if (draft.sections.length === 0) {
    errors.push({ code: 'NO_SECTIONS' });
    return errors;
  }

  const emptySectionIds = draft.sections
    .filter((section) => section.subsections.length === 0)
    .map((section) => section.localId);
  if (emptySectionIds.length > 0) {
    errors.push({ code: 'EMPTY_SECTION', sectionLocalIds: emptySectionIds });
  }

  const grandTotal = computeGrandTotal(draft.sections);
  if (!isSchemeBalanced(draft.targetTotal, grandTotal)) {
    errors.push({ code: 'UNBALANCED' });
  }

  return errors;
};

export const isPublishable = (draft: EditableScheme): boolean => validateSchemeDraft(draft).length === 0;
