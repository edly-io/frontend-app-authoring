/**
 * Component-layer (editor draft) types for the Scheme tab.
 *
 * These are distinct from the API-layer types in `data/types.ts`: server IDs
 * are never round-tripped while editing (the API assigns IDs on write), so
 * the local draft tracks rows by a client-only `localId` instead. `order` is
 * implicit in array position and is only computed when converting back to a
 * `SaveSchemeInput` for the PUT request.
 */

export interface EditableSubsection {
  localId: string;
  title: string;
  maxMarks: number;
}

export interface EditableSection {
  localId: string;
  title: string;
  subsections: EditableSubsection[];
}

export interface EditableScheme {
  name: string;
  targetTotal: number;
  sections: EditableSection[];
}
