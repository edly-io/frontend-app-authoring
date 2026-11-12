import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export interface CourseEnrollmentRow {
  username: string;
  email: string;
  name: string;
  enrolledAt: string | null;
  lastActivity: string | null;
  progressPct: number | null;
  completedUnits: number | null;
  totalUnits: number | null;
  completedAt: string | null;
  badgeAwarded: boolean;
  /** False when no badge exists for this course, which is not the same as nobody earning one. */
  badgeConfigured?: boolean;
}

export interface CourseCurriculum {
  uuid: string;
  title: string;
}

export interface CurriculumAssignmentRow {
  username: string;
  email: string;
  name: string;
  assignedAt: string | null;
  active: boolean;
  coursesCompleted: number | null;
  coursesTotal: number | null;
  completeAt: string | null;
  completeBadgeAwardedAt: string | null;
  completeBadgeConfigured?: boolean;
  kcUnlocksAt: string | null;
  kcTakenAt: string | null;
  kcScorePct: number | null;
  kcPassed: boolean | null;
  kcAttemptsUsed: number | null;
  retainedAt: string | null;
  retainedBadgeAwardedAt: string | null;
  retainedBadgeConfigured?: boolean;
  currentStreak: number | null;
  longestStreak: number | null;
  lifetimePoints: number | null;
  lastActivity: string | null;
}

const getUberApiUrl = () => `${getConfig().STUDIO_BASE_URL}/api/uber`;
const getReportingApiUrl = () => `${getUberApiUrl()}/reporting/v1`;

export interface UberFlags {
  enableReporting: boolean;
}

export const getUberFlagsUrl = () => `${getUberApiUrl()}/flags/`;

export async function getUberFlags(): Promise<UberFlags> {
  const { data } = await getAuthenticatedHttpClient().get(getUberFlagsUrl());
  return camelCaseObject(data);
}

export const getCourseEnrollmentsUrl = (courseId: string) => (
  `${getReportingApiUrl()}/courses/${encodeURIComponent(courseId)}/enrollments/`
);
export const getCourseCurriculumsUrl = (courseId: string) => (
  `${getReportingApiUrl()}/courses/${encodeURIComponent(courseId)}/curriculums/`
);
export const getCurriculumAssignmentsUrl = (curriculumUuid: string) => (
  `${getReportingApiUrl()}/curriculums/${encodeURIComponent(curriculumUuid)}/assignments/`
);

export async function getCourseEnrollments(
  courseId: string,
  page: number,
  pageSize: number,
  search: string,
): Promise<PaginatedResponse<CourseEnrollmentRow>> {
  const { data } = await getAuthenticatedHttpClient().get(
    getCourseEnrollmentsUrl(courseId),
    { params: { page, page_size: pageSize, search } },
  );
  return camelCaseObject(data);
}

// The backend applies ``search`` to the CSV too, so the export matches the rows on screen.
export const getCourseEnrollmentsCsvUrl = (courseId: string, search = '') => (
  `${getCourseEnrollmentsUrl(courseId)}?format=csv${search ? `&search=${encodeURIComponent(search)}` : ''}`
);

export async function getCourseCurriculums(courseId: string): Promise<CourseCurriculum[]> {
  const { data } = await getAuthenticatedHttpClient().get(getCourseCurriculumsUrl(courseId));
  return camelCaseObject(data);
}

export interface StaffCourse {
  courseId: string;
  displayName: string;
}

export const getStaffCoursesUrl = () => `${getReportingApiUrl()}/courses/`;
export const getAllCurriculumsUrl = () => `${getReportingApiUrl()}/curriculums/`;

export async function getStaffCourses(): Promise<StaffCourse[]> {
  const { data } = await getAuthenticatedHttpClient().get(getStaffCoursesUrl());
  return camelCaseObject(data);
}

export async function getAllCurriculums(): Promise<CourseCurriculum[]> {
  const { data } = await getAuthenticatedHttpClient().get(getAllCurriculumsUrl());
  return camelCaseObject(data);
}

export const getCurriculumAssignmentsCsvUrl = (curriculumUuid: string, search = '') => (
  `${getCurriculumAssignmentsUrl(curriculumUuid)}?format=csv${search ? `&search=${encodeURIComponent(search)}` : ''}`
);

export async function getCurriculumAssignments(
  curriculumUuid: string,
  page: number,
  pageSize: number,
  search: string,
): Promise<PaginatedResponse<CurriculumAssignmentRow>> {
  const { data } = await getAuthenticatedHttpClient().get(
    getCurriculumAssignmentsUrl(curriculumUuid),
    { params: { page, page_size: pageSize, search } },
  );
  return camelCaseObject(data);
}

/** Figures shared by a chart's headline and by one row of the table beneath it. */
export interface AssessmentSummary {
  /** Questions in the pre/post check. Null when the block could not be read, not when it is empty. */
  preQuestions?: number | null;
  postQuestions?: number | null;
  /** How many courses or curriculums the figures are drawn from; 1 on a table row. */
  counted: number;
  /** Learners with both a pre and a post score. The averages are over exactly these learners. */
  learners: number;
  avgPrePct: number | null;
  avgPostPct: number | null;
  gainPct: number | null;
}

export interface AssessmentOutcome {
  /** Learners who submitted the Final check at all, passed or not. */
  attempted: number;
  passed: number;
  failed: number;
  passRatePct: number | null;
}

export interface CourseAssessmentRow extends AssessmentSummary, AssessmentOutcome {
  courseId: string;
  displayName: string;
}

export interface CurriculumAssessmentRow extends AssessmentSummary, AssessmentOutcome {
  uuid: string;
  title: string;
  /** Days after the curriculum is completed before its retention course unlocks. */
  delayDays: number;
  passThresholdPct: number;
  maxAttempts: number;
}

export interface AssessmentStats {
  courses: { totals: AssessmentSummary & AssessmentOutcome; rows: CourseAssessmentRow[]; };
  curriculums: {
    totals: AssessmentSummary & AssessmentOutcome;
    rows: CurriculumAssessmentRow[];
  };
}

export const getAssessmentStatsUrl = () => `${getReportingApiUrl()}/assessment-stats/`;

export async function getAssessmentStats(): Promise<AssessmentStats> {
  const { data } = await getAuthenticatedHttpClient().get(getAssessmentStatsUrl());
  return camelCaseObject(data);
}
