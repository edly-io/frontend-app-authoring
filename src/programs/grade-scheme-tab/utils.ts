import type { SaveSchemeInput, Scheme } from './data/types';
import { SECTION_VARIANTS } from './constants';
import type { EditableScheme, EditableSection, EditableSubsection } from './types';

export const generateLocalId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const getSectionVariant = (index: number) => SECTION_VARIANTS[index % SECTION_VARIANTS.length];

export const getSectionTotal = (section: EditableSection): number => (
  section.subsections.reduce((sum, subsection) => sum + subsection.maxMarks, 0)
);

export const computeGrandTotal = (sections: EditableSection[]): number => (
  sections.reduce((sum, section) => sum + getSectionTotal(section), 0)
);

export const isSchemeBalanced = (targetTotal: number, grandTotal: number): boolean => (
  targetTotal > 0 && grandTotal === targetTotal
);

const toEditableSubsection = (subsection: Scheme['sections'][number]['subsections'][number]): EditableSubsection => ({
  localId: generateLocalId('subsection'),
  title: subsection.title,
  maxMarks: subsection.maxMarks,
});

const toEditableSection = (section: Scheme['sections'][number]): EditableSection => ({
  localId: generateLocalId('section'),
  title: section.title,
  subsections: section.subsections.map(toEditableSubsection),
});

/** Converts a server Scheme into a local editable draft (drops server IDs/derived totals). */
export const toEditableScheme = (scheme: Scheme): EditableScheme => ({
  name: scheme.name,
  targetTotal: scheme.targetTotal,
  sections: scheme.sections.map(toEditableSection),
});

export const createEmptyEditableScheme = (defaultName: string, defaultTargetTotal = 0): EditableScheme => ({
  name: defaultName,
  targetTotal: defaultTargetTotal,
  sections: [],
});

export const createEmptySection = (title: string): EditableSection => ({
  localId: generateLocalId('section'),
  title,
  // Seed with one default subsection sharing the section's title so a newly
  // added section can be scored directly and isn't publish-blocked for
  // being empty; the user can rename/split it into multiple line items.
  subsections: [{ localId: generateLocalId('subsection'), title, maxMarks: 0 }],
});

export const createEmptySubsection = (title: string): EditableSubsection => ({
  localId: generateLocalId('subsection'),
  title,
  maxMarks: 0,
});

/**
 * A stable, localId-independent fingerprint of the editable tree, used to detect
 * unsaved changes (`localId`s are randomly generated per-load and must be ignored).
 */
export const getSchemeTreeSignature = (targetTotal: number, sections: EditableSection[]): string => JSON.stringify({
  targetTotal,
  sections: sections.map((section) => ({
    title: section.title,
    subsections: section.subsections.map((subsection) => ({
      title: subsection.title,
      maxMarks: subsection.maxMarks,
    })),
  })),
});

/** Converts a local editable draft into the PUT request payload, deriving `order` from array position. */
export const toSaveSchemeInput = (draft: EditableScheme): SaveSchemeInput => ({
  name: draft.name,
  targetTotal: draft.targetTotal,
  sections: draft.sections.map((section, sectionOrder) => ({
    title: section.title,
    order: sectionOrder,
    subsections: section.subsections.map((subsection, subsectionOrder) => ({
      title: subsection.title,
      maxMarks: subsection.maxMarks,
      order: subsectionOrder,
    })),
  })),
});
