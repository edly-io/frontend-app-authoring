/**
 * Component-layer (editor draft) types for the Scheme tab.
 *
 * These are distinct from the API-layer types in `data/types.ts`. The local
 * draft tracks rows by a client-only `localId`; `serverId` carries the DB
 * primary key so the PUT body can round-trip it and the backend can update
 * existing rows in-place (producing auditlog action=1 with field diffs).
 * `order` is implicit in array position and is only computed on PUT.
 */

export interface EditableSubsection {
  localId: string;
  serverId?: number;
  title: string;
  maxMarks: number;
}

export interface EditableSection {
  localId: string;
  serverId?: number;
  title: string;
  subsections: EditableSubsection[];
}

export interface EditableScheme {
  name: string;
  targetTotal: number;
  sections: EditableSection[];
}
