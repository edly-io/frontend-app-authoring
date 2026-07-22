/**
 * Component-layer (editor draft) types for the Add Trainee Results page.
 *
 * These combine the published scheme's criteria tree (structure/max marks,
 * from `../grade-scheme-tab/data/types`) with the marks a trainee has been
 * awarded so far. Rows are keyed by the scheme's own server IDs
 * (`sectionId`/`subsectionId`) since, unlike the Scheme tab, this page never
 * edits the tree's structure — only the scores against it.
 */

import type { TraineeResultStatus } from './data/types';

export interface EditableSubsectionScore {
  subsectionId: number;
  title: string;
  maxMarks: number;
  marksAwarded: number;
}

export interface EditableSectionScore {
  sectionId: number;
  title: string;
  maxMarks: number;
  subsections: EditableSubsectionScore[];
}

export interface EditableTraineeResult {
  status: TraineeResultStatus;
  sections: EditableSectionScore[];
}
