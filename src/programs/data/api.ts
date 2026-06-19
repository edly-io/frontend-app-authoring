// When backend APIs are ready this is the ONLY file that changed.
// All components call only the hooks in apiHooks.ts.

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type {
  Course,
  Instructor,
  Learner,
  PaginatedCourses,
  PaginatedLearners,
  Program,
  ProgramConfig,
  ProgramDetailResponse,
} from './types';

const getProgramsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/rwaq/api/programs`;

// ── Response → Course type transformation ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCourse = (d: any): Course => ({
  id: d.course_key,
  displayName: d.display_name,
  org: d.org,
  run: d.run,
});

// ── Response → Program type transformation ──────────────────────────────────
// SlugRelatedField serializes FK as string (short_name / slug), not an object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProgram = (d: any): Program => ({
  id: d.program_key,
  displayName: d.name,
  org: d.organization,
  programType: d.program_type,
  run: d.batch,
  shortDescription: d.description ?? '',
  longDescription: d.long_description ?? '',
  status: d.status ?? 'draft',
  isFeatured: d.is_featured ?? false,
  startDate: d.start_date ?? '',
  endDate: d.end_date ?? '',
  image: d.card_image ?? '',
  courses: d.courses?.map(toCourse) ?? [],
});

// ── Config — GET /rwaq/api/programs/config/ ───────────────────────────────────
export const getProgramsConfig = async (): Promise<ProgramConfig> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/config/`);
  return {
    orgs: data.organizations.map((o: any) => ({ id: o.id, name: o.name, shortName: o.short_name })),
    programTypes: data.program_types.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
    // Statuses are stable constants; not returned by config endpoint
    statuses: ['draft', 'active', 'archived'],
  };
};

// ── List — GET /rwaq/api/programs/ ────────────────────────────────────────────
export const getPrograms = async (): Promise<Program[]> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/`);
  // Handle both paginated { results: [...] } and flat array responses
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toProgram);
};

// ── Detail — GET /rwaq/api/programs/<program_key>/ ───────────────────────────
export const getProgramDetail = async (programId: string): Promise<ProgramDetailResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/${programId}/`);
  return {
    program: toProgram(data),
  };
};

// ── Create — POST /rwaq/api/programs/ ────────────────────────────────────────
export const createProgram = async (input: Omit<Program, 'id'>): Promise<Program> => {
  const payload = {
    name: input.displayName,
    organization: input.org,
    program_type: input.programType,
    batch: input.run,
  };
  const { data } = await getAuthenticatedHttpClient().post(`${getProgramsBaseUrl()}/`, payload);
  return toProgram(data);
};

// ── Update — PATCH /rwaq/api/programs/<program_key>/ ─────────────────────────
// Always sent as multipart/form-data so card_image (ImageField) works.
// imageFile is undefined when the user has not changed the image.
export const updateProgram = async (
  programId: string,
  data: Partial<Program>,
  imageFile?: File | null,
): Promise<Program> => {
  const formData = new FormData();

  if (data.displayName !== undefined) { formData.append('name', data.displayName); }
  if (data.shortDescription !== undefined) { formData.append('description', data.shortDescription ?? ''); }
  if (data.longDescription !== undefined) { formData.append('long_description', data.longDescription ?? ''); }
  if (data.status !== undefined) { formData.append('status', data.status ?? 'draft'); }
  if (data.isFeatured !== undefined) { formData.append('is_featured', String(data.isFeatured)); }
  if (data.startDate !== undefined) { formData.append('start_date', data.startDate ?? ''); }
  if (data.endDate !== undefined) { formData.append('end_date', data.endDate ?? ''); }
  if (imageFile) { formData.append('card_image', imageFile); }

  // Intentionally not sent: org / programType / run (immutable after creation)
  //                         courses (separate API)

  const { data: result } = await getAuthenticatedHttpClient().patch(
    `${getProgramsBaseUrl()}/${programId}/`,
    formData,
  );
  return toProgram(result);
};

// ── All platform courses — GET /rwaq/api/programs/courses/ ───────────────────
export interface GetCoursesParams {
  page?: number;
  search?: string;
}

export const getCourses = async (params: GetCoursesParams = {}): Promise<PaginatedCourses> => {
  const pageSize = 5; // temporary — lower for pagination testing; revert to backend default
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/courses/`,
    { params: { page: params.page ?? 1, page_size: pageSize, ...(params.search ? { search: params.search } : {}) } },
  );
  const results: any[] = data.results ?? [];
  const pagination = data.pagination ?? {};
  const count = pagination.count ?? 0;
  return {
    results: results.map(toCourse),
    count,
    numPages: pagination.num_pages ?? (Math.ceil(count / pageSize) || 1),
  };
};

// ── Add course to program — POST /rwaq/api/programs/<key>/courses/ ────────────
export const addCourseToProgram = async (programId: string, courseId: string): Promise<Course> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getProgramsBaseUrl()}/${programId}/courses/`,
    { course_id: courseId },
  );
  return toCourse(data);
};

export interface GetLearnersParams {
  page?: number;
  search?: string;
}

// Shared mapping from UserSerializer response ({id, username, email, first_name, last_name})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (d: any): Learner => ({
  id: d.username,
  username: d.username,
  email: d.email,
  name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username,
});

// ── Platform users — GET /rwaq/api/programs/users/?role=instructor|learner ─────
export const getPlatformUsers = async (
  params: { role: 'instructor' | 'learner' } & GetLearnersParams,
): Promise<PaginatedLearners> => {
  const pageSize = 5;
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/users/`,
    {
      params: {
        role: params.role,
        page: params.page ?? 1,
        page_size: pageSize,
        ...(params.search ? { search: params.search } : {}),
      },
    },
  );
  const pagination = data.pagination ?? {};
  const count = pagination.count ?? 0;
  return {
    results: (data.results ?? []).map(toUser),
    count,
    numPages: pagination.num_pages ?? (Math.ceil(count / pageSize) || 1),
  };
};

// ── Course team — GET ${STUDIO_BASE_URL}/api/contentstore/v1/course_team/<id> ─
export const getCourseTeam = async (courseId: string): Promise<Instructor[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getConfig().STUDIO_BASE_URL}/api/contentstore/v1/course_team/${courseId}`,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.users ?? []).map((u: any) => ({
    id: u.username,
    username: u.username,
    email: u.email,
    role: u.role,
    name: u.username,
  }));
};

// ── Program enrollments — GET /rwaq/api/programs/<key>/learners/ ───────────────
// search param is wired but silently ignored until backend adds filter_backends
export const getProgramEnrollments = async (
  programId: string,
  params: GetLearnersParams = {},
): Promise<PaginatedLearners> => {
  const pageSize = 5;
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/${programId}/learners/`,
    {
      params: {
        page: params.page ?? 1,
        page_size: pageSize,
        ...(params.search ? { search: params.search } : {}),
      },
    },
  );
  const pagination = data.pagination ?? {};
  const count = pagination.count ?? 0;
  return {
    results: (data.results ?? []).map(toUser),
    count,
    numPages: pagination.num_pages ?? (Math.ceil(count / pageSize) || 1),
  };
};

// ── Enroll learner in program — POST /rwaq/api/programs/<key>/learners/ ────────
export const enrollLearnerInProgram = async (programId: string, username: string): Promise<void> => {
  await getAuthenticatedHttpClient().post(
    `${getProgramsBaseUrl()}/${programId}/learners/`,
    { username },
  );
};

// ── Unenroll learner — DELETE /rwaq/api/programs/<key>/learners/?username=... ──
export const unenrollLearnerFromProgram = async (programId: string, username: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getProgramsBaseUrl()}/${programId}/learners/`,
    { params: { username } },
  );
};

// ── Remove course from program — DELETE /rwaq/api/programs/<key>/courses/ ──────
export const removeCourseFromProgram = async (programId: string, courseId: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getProgramsBaseUrl()}/${programId}/courses/`,
    { params: { course_id: courseId } },
  );
};

