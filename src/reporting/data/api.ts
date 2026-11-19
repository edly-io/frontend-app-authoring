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
  kcPassed: boolean | null;
  retainedAt: string | null;
  retainedBadgeAwardedAt: string | null;
  retainedBadgeConfigured?: boolean;
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

/** One single course (a `kind: 'course'` curriculum) and how many of its learners its retention check kept. */
export interface RetentionRow extends AssessmentOutcome {
  courseId: string;
  displayName: string;
  retentionCourseId: string;
  /** Learners on the course, including those who have not sat the retention check yet. */
  assigned: number;
  delayDays: number;
  passThresholdPct: number;
  maxAttempts: number;
}

/** One learning path with a 30-day retention check, and how many of its learners it kept. */
export interface CurriculumRetentionRow extends AssessmentOutcome {
  uuid: string;
  title: string;
  retentionCourseId: string;
  coursesTotal: number;
  assigned: number;
  /** Learners who have finished the path; only they ever reach the check. */
  completed: number;
  delayDays: number;
  passThresholdPct: number;
  maxAttempts: number;
}

export interface AssessmentStats {
  courses: { totals: AssessmentSummary & AssessmentOutcome; rows: CourseAssessmentRow[]; };
  retention: {
    totals: AssessmentOutcome & { counted: number; };
    rows: RetentionRow[];
  };
  curriculumRetention: {
    /** The retention split, over the learners who sat the check. */
    totals: AssessmentOutcome & { counted: number; };
    /** The same shape over everyone assigned, counting those who finished the path. */
    completion: AssessmentOutcome & { counted: number; };
    rows: CurriculumRetentionRow[];
  };
}

export const getAssessmentStatsUrl = () => `${getReportingApiUrl()}/assessment-stats/`;

export async function getAssessmentStats(): Promise<AssessmentStats> {
  const { data } = await getAuthenticatedHttpClient().get(getAssessmentStatsUrl());
  return camelCaseObject(data);
}

/**
 * Fetch a CSV export and hand it to the browser as a download.
 *
 * A plain `<a href download>` pointing at Studio does not work reliably: the `download` attribute is
 * ignored across origins, and a top-level navigation carries no `USE-JWT-COOKIE` header, so it
 * authenticates only where the browser happens to hold a Studio session cookie. Fetching it through the
 * authenticated client is how every other call here is made, and a same-origin blob URL makes `download`
 * - and the filename - work wherever the MFE is hosted.
 */
export async function downloadCsv(url: string, filename: string): Promise<void> {
  const { data } = await getAuthenticatedHttpClient().get(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(data as Blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoked on a later tick: Safari cancels a download whose object URL is released in the same tick
    // as the click that started it.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
