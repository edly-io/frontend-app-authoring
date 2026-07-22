/**
 * Domain types for the Program Result Management API — trainee-results
 * endpoints only (`/fbr/api/program-results/<program_key>/trainees/...` and
 * `/fbr/api/program-results/<program_key>/results/<trainee_id>/...`).
 *
 * The scored criteria tree (categories/line items and their max marks) is
 * not modeled here — it is the published `Scheme` from the Grade Scheme tab
 * (see `../../grade-scheme-tab/data/types`), reused as-is. This module only
 * models the trainee, the marks awarded per line item, and the read-only
 * edX course-score data that is auto-synced for context.
 */

export type TraineeResultStatus = 'in_progress' | 'finalized';

export interface TraineeSummary {
  id: string; // = username
  username: string;
  email: string;
  name: string;
}

export interface CourseModuleScore {
  name: string;
  weight: number;
  grade: number;
  weightedGrade: number;
}

export interface CourseScore {
  courseId: string;
  courseCode: string;
  courseName: string;
  percent: number;
  passed: boolean;
  letterGrade: string | null;
  moduleCount: number;
  modules: CourseModuleScore[];
}

export interface TraineeCourseScores {
  programKey: string;
  aggregatePercent: number;
  courses: CourseScore[];
}

export interface SubsectionScore {
  subsectionId: number;
  marksAwarded: number;
}

export interface TraineeResult {
  traineeId: string;
  programKey: string;
  status: TraineeResultStatus;
  scores: SubsectionScore[];
  grandTotal: number;
  updatedAt: string;
}

export interface SaveTraineeResultInput {
  scores: SubsectionScore[];
}
