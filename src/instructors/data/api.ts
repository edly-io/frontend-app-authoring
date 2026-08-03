// When backend APIs are ready this is the ONLY file that changed.
// All components call only the hooks in apiHooks.ts.

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type { Course } from '../../programs/data/types';
import type {
  InstructorDetailResponse,
  InstructorOrganization,
  InstructorProfile,
  InstructorSummary,
} from './types';

const getInstructorsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/rwaq/api/instructors`;

// ── Response → Course type transformation ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCourse = (d: any): Course => ({
  id: d.course_key,
  displayName: d.display_name,
  org: d.org,
  run: d.run,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toOrganization = (d: any): InstructorOrganization => ({
  id: d.id,
  name: d.name,
  shortName: d.short_name,
  arabicName: d.organization_arabic_name ?? '',
  logo: d.organization_logo ?? null,
});

// ── Response → InstructorProfile type transformation ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toInstructorProfile = (d: any): InstructorProfile => ({
  id: d.id,
  name: d.name,
  image: d.image ?? null,
  detail: d.detail ?? '',
  featured: d.featured ?? false,
  featuredVideo: d.featured_video ?? '',
  courses: d.courses?.map(toCourse) ?? [],
  organizations: d.organizations?.map(toOrganization) ?? [],
});

// ── List — GET /rwaq/api/instructors/ ─────────────────────────────────────────
export const getInstructors = async (): Promise<InstructorProfile[]> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getInstructorsBaseUrl()}/`);
  // Handle both paginated { results: [...] } and flat array responses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toInstructorProfile);
};

// ── Detail — GET /rwaq/api/instructors/<id>/ ──────────────────────────────────
export const getInstructorDetail = async (instructorId: string): Promise<InstructorDetailResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getInstructorsBaseUrl()}/${instructorId}/`);
  return {
    instructor: toInstructorProfile(data),
  };
};

// ── Create — POST /rwaq/api/instructors/ ──────────────────────────────────────
export const createInstructor = async (input: { name: string }): Promise<InstructorProfile> => {
  const { data } = await getAuthenticatedHttpClient().post(`${getInstructorsBaseUrl()}/`, {
    name: input.name,
  });
  return toInstructorProfile(data);
};

// ── Update — PATCH /rwaq/api/instructors/<id>/ ────────────────────────────────
// Always sent as multipart/form-data so image (ImageField) works.
// imageFile is undefined when the user has not changed the image.
export const updateInstructor = async (
  instructorId: string,
  data: Partial<InstructorProfile>,
  imageFile?: File | null,
): Promise<InstructorProfile> => {
  const formData = new FormData();

  if (data.name !== undefined) { formData.append('name', data.name); }
  if (data.detail !== undefined) { formData.append('detail', data.detail ?? ''); }
  if (data.featured !== undefined) { formData.append('featured', String(data.featured)); }
  if (data.featuredVideo !== undefined) { formData.append('featured_video', data.featuredVideo ?? ''); }
  if (imageFile) { formData.append('image', imageFile); }

  // Intentionally not sent: courses (separate API)

  const { data: result } = await getAuthenticatedHttpClient().patch(
    `${getInstructorsBaseUrl()}/${instructorId}/`,
    formData,
  );
  return toInstructorProfile(result);
};

// ── Link course to instructor — POST /rwaq/api/instructors/<id>/courses/ ─────
export const addCourseToInstructor = async (instructorId: string, courseId: string): Promise<Course> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getInstructorsBaseUrl()}/${instructorId}/courses/`,
    { course_id: courseId },
  );
  return toCourse(data);
};

// ── Unlink course — DELETE /rwaq/api/instructors/<id>/courses/?course_id=... ──
export const removeCourseFromInstructor = async (instructorId: string, courseId: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getInstructorsBaseUrl()}/${instructorId}/courses/`,
    { params: { course_id: courseId } },
  );
};

// ── Response → InstructorSummary type transformation ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toInstructorSummary = (d: any): InstructorSummary => ({
  id: d.id,
  name: d.name,
  image: d.image ?? null,
});

// ── Instructors linked to a course — GET /rwaq/api/instructors/by-course/<id>/ ─
// Reverse lookup used by the course's Schedule & Details page.
export const getInstructorsForCourse = async (courseId: string): Promise<InstructorSummary[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getInstructorsBaseUrl()}/by-course/${courseId}/`,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toInstructorSummary);
};

// ── Link instructor to course — POST /rwaq/api/instructors/by-course/<id>/ ────
export const linkInstructorToCourse = async (
  courseId: string,
  instructorId: number,
): Promise<InstructorSummary> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getInstructorsBaseUrl()}/by-course/${courseId}/`,
    { instructor_id: instructorId },
  );
  return toInstructorSummary(data);
};

// ── Unlink instructor — DELETE /rwaq/api/instructors/by-course/<id>/?instructor_id=... ─
export const unlinkInstructorFromCourse = async (courseId: string, instructorId: number): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getInstructorsBaseUrl()}/by-course/${courseId}/`,
    { params: { instructor_id: instructorId } },
  );
};
