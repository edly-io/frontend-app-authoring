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
  badgeConfigured: boolean;
}

export interface CourseCurriculum {
  uuid: string;
  title: string;
}

export type CourseProgressStatus = 'completed' | 'in_progress' | 'not_started' | 'locked';

export interface CourseProgress {
  courseId: string;
  displayName: string;
  finishedAt: string | null;
  progressPct: number | null;
  status: CourseProgressStatus;
}

export interface CurriculumAssignmentRow {
  username: string;
  email: string;
  name: string;
  assignedAt: string | null;
  active: boolean;
  coursesCompleted: number | null;
  coursesTotal: number | null;
  courseProgress: CourseProgress[];
  completeAt: string | null;
  completeBadgeAwardedAt: string | null;
  completeBadgeConfigured: boolean;
  kcUnlocksAt: string | null;
  kcTakenAt: string | null;
  kcScorePct: number | null;
  kcPassed: boolean | null;
  kcAttemptsUsed: number | null;
  retainedAt: string | null;
  retainedBadgeAwardedAt: string | null;
  retainedBadgeConfigured: boolean;
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

export const getCourseEnrollmentsCsvUrl = (courseId: string) => (
  `${getCourseEnrollmentsUrl(courseId)}?format=csv`
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

export const getCurriculumAssignmentsCsvUrl = (curriculumUuid: string) => (
  `${getCurriculumAssignmentsUrl(curriculumUuid)}?format=csv`
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
