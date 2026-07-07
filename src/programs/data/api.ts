// When backend APIs are ready this is the ONLY file that changed.
// All components call only the hooks in apiHooks.ts.

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type {
  Batch,
  CityOption,
  Course,
  CreateProgramInput,
  Instructor,
  Learner,
  PaginatedCourses,
  PaginatedLearners,
  Program,
  ProgramConfig,
  ProgramDetailResponse,
} from './types';

export { getCurrentFbrProfile, getCurrentFbrProfileUrl } from '@src/fbr-access/api';

const getProgramsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/programs`;
export const getFbrCitiesUrl = () => `${getConfig().LMS_BASE_URL}/fbr/api/biodata/v1/users/cities/`;

export const getFbrCities = async (): Promise<CityOption[]> => {
  const { data } = await getAuthenticatedHttpClient().get(getFbrCitiesUrl());
  return Array.isArray(data) ? data : [];
};

// ── Response → Course type transformation ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCourse = (d: any): Course => ({
  id: d.course_key,
  displayName: d.display_name,
  org: d.org,
  run: d.run,
  targetAudience: d.target_audience?.name ?? '',
});

// ── Response → Program type transformation ──────────────────────────────────
// SlugRelatedField serializes FK as string (short_name / slug), not an object.
// target_audience is a FK returning {id, name}; target_audiences is the full list.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProgram = (d: any): Program => ({
  id: d.program_key,
  displayName: d.name,
  org: d.organization,
  programType: d.program_type,
  run: d.batch,
  targetAudience: d.target_audience?.name ?? '',
  city: d.city?.id !== undefined ? String(d.city.id) : '',
  shortDescription: d.description ?? '',
  longDescription: d.long_description ?? '',
  status: d.status ?? 'draft',
  isFeatured: d.is_featured ?? false,
  startDate: d.start_date ?? '',
  endDate: d.end_date ?? '',
  image: d.card_image ?? '',
  courses: d.courses?.map(toCourse) ?? [],
});

// ── Config — GET /fbr/api/programs/config/ ───────────────────────────────────
export const getProgramsConfig = async (): Promise<ProgramConfig> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/config/`);
  return {
    orgs: data.organizations.map((o: any) => ({ id: o.id, name: o.name, shortName: o.short_name })),
    programTypes: data.program_types.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
    cities: (data.cities ?? []).map((c: any) => ({ id: c.id, name: c.name })),
    // Statuses are stable constants; not returned by config endpoint
    statuses: ['draft', 'active', 'archived', 'freezed'],
  };
};

// ── List — GET /fbr/api/programs/ ────────────────────────────────────────────
export const getPrograms = async (): Promise<Program[]> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/`);
  // Handle both paginated { results: [...] } and flat array responses
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toProgram);
};

// ── Detail — GET /fbr/api/programs/<program_key>/ ───────────────────────────
export const getProgramDetail = async (programId: string): Promise<ProgramDetailResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/${programId}/`);
  return {
    program: toProgram(data),
    // target_audiences in the detail response is the full list of all audiences system-wide
    availableAudiences: (data.target_audiences ?? []).map((a: any) => a.name as string),
    // cities in the detail response is the full list of all cities
    availableCities: (data.cities ?? []).map((c: any) => ({ id: c.id, name: c.name })),
  };
};

// ── Create — POST /fbr/api/programs/ ────────────────────────────────────────
export const createProgram = async (input: CreateProgramInput): Promise<Program> => {
  const payload = {
    name: input.displayName,
    organization: input.org,
    program_type: input.programType,
    batch: input.run,
    ...(input.cityId !== undefined ? { city: input.cityId } : {}),
  };
  const { data } = await getAuthenticatedHttpClient().post(`${getProgramsBaseUrl()}/`, payload);
  return toProgram(data);
};

// ── Update — PATCH /fbr/api/programs/<program_key>/ ─────────────────────────
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
  if (data.targetAudience !== undefined) { formData.append('target_audience', data.targetAudience ?? ''); }
  if (data.city !== undefined) { formData.append('city', data.city ?? ''); }
  if (imageFile) { formData.append('card_image', imageFile); }

  // Intentionally not sent: org / programType / run (immutable after creation)
  //                         courses (separate API)

  const { data: result } = await getAuthenticatedHttpClient().patch(
    `${getProgramsBaseUrl()}/${programId}/`,
    formData,
  );
  return toProgram(result);
};

// ── All platform courses — GET /fbr/api/programs/courses/ ───────────────────
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

// ── Add course to program — POST /fbr/api/programs/<key>/courses/ ────────────
export const addCourseToProgram = async (programId: string, courseId: string): Promise<Course> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getProgramsBaseUrl()}/${programId}/courses/`,
    { course_id: courseId },
  );
  return toCourse(data);
};

// ── All target audiences — GET /fbr/api/programs/target-audiences/ ───────────
export const getTargetAudiences = async (): Promise<string[]> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/target-audiences/`);
  return (data as any[]).map((a) => a.name as string);
};

// ── Course target audience — GET /fbr/api/programs/courses/<courseKey>/ ──────
export const getCourseTargetAudience = async (courseKey: string): Promise<Course> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/courses/${encodeURIComponent(courseKey)}/`,
  );
  return toCourse(data);
};

// ── Update course target audience — PATCH /fbr/api/programs/courses/<key>/ ──
export const updateCourseTargetAudience = async (
  courseKey: string,
  audienceName: string | null,
): Promise<Course> => {
  const { data } = await getAuthenticatedHttpClient().patch(
    `${getProgramsBaseUrl()}/courses/${encodeURIComponent(courseKey)}/`,
    { target_audience: audienceName },
  );
  return toCourse(data);
};

export interface GetInstructorsParams {
  page?: number;
  search?: string;
  programKey?: string;
}

export interface GetLearnersParams {
  page?: number;
  search?: string;
  programKey?: string;
}

// Shared mapping from UserSerializer response ({id, username, email, first_name, last_name})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (d: any): Learner => ({
  id: d.username,
  username: d.username,
  email: d.email,
  name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username,
});

// ── Platform users — GET /fbr/api/programs/users/?role=instructor|learner ─────
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
        ...(params.programKey ? { program_key: params.programKey } : {}),
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

// ── Course team — GET /fbr/api/programs/courses/<course_key>/team/ ─────────
export const getCourseTeam = async (courseId: string): Promise<Instructor[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/courses/${encodeURIComponent(courseId)}/team/`,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : (data.results ?? [])).map((u: any) => ({
    id: u.username,
    username: u.username,
    email: u.email,
    role: u.role,
    name: u.full_name,
  }));
};

// ── Add instructor to course — POST /fbr/api/programs/courses/<course_key>/team/
export const addInstructorToCourse = async (courseId: string, username: string): Promise<void> => {
  await getAuthenticatedHttpClient().post(
    `${getProgramsBaseUrl()}/courses/${encodeURIComponent(courseId)}/team/`,
    { username },
  );
};

// ── Remove instructor from course — DELETE ${STUDIO_BASE_URL}/course_team/<id>/<email>
export const removeInstructorFromCourse = async (courseId: string, email: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getConfig().STUDIO_BASE_URL}/course_team/${courseId}/${email}`,
  );
};

// ── Program enrollments — GET /fbr/api/programs/<key>/learners/ ───────────────
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

// ── Enroll learner in program — POST /fbr/api/programs/<key>/learners/ ────────
export const enrollLearnerInProgram = async (programId: string, username: string): Promise<void> => {
  await getAuthenticatedHttpClient().post(
    `${getProgramsBaseUrl()}/${programId}/learners/`,
    { username },
  );
};

// ── Unenroll learner — DELETE /fbr/api/programs/<key>/learners/?username=... ──
export const unenrollLearnerFromProgram = async (programId: string, username: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getProgramsBaseUrl()}/${programId}/learners/`,
    { params: { username } },
  );
};

// ── Remove course from program — DELETE /fbr/api/programs/<key>/courses/ ──────
export const removeCourseFromProgram = async (programId: string, courseId: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getProgramsBaseUrl()}/${programId}/courses/`,
    { params: { course_id: courseId } },
  );
};

// ── MOCK: Batches — GET /fbr/api/programs/batches/ ───────────────────────────
// MOCK — replace with real endpoint when backend ships

const MOCK_BATCHES: Batch[] = [
  { id: '55', name: 'Batch 55' },
  { id: '54', name: 'Batch 54' },
  { id: '53', name: 'Batch 53' },
  { id: '52', name: 'Batch 52' },
  { id: '51', name: 'Batch 51' },
];

const MOCK_BATCH_USERS: Record<string, Learner[]> = {
  55: [
    {
      id: 'ahmed.riaz', username: 'ahmed.riaz', email: 'ahmed.riaz@batch55.pk', name: 'Ahmed Riaz',
    },
    {
      id: 'sara.noor', username: 'sara.noor', email: 'sara.noor@batch55.pk', name: 'Sara Noor',
    },
    {
      id: 'hassan.ali', username: 'hassan.ali', email: 'hassan.ali@batch55.pk', name: 'Hassan Ali',
    },
    {
      id: 'fatima.malik', username: 'fatima.malik', email: 'fatima.malik@batch55.pk', name: 'Fatima Malik',
    },
  ],
  54: [
    {
      id: 'usman.butt', username: 'usman.butt', email: 'usman.butt@batch54.pk', name: 'Usman Butt',
    },
    {
      id: 'zainab.khan', username: 'zainab.khan', email: 'zainab.khan@batch54.pk', name: 'Zainab Khan',
    },
    {
      id: 'tariq.nadeem', username: 'tariq.nadeem', email: 'tariq.nadeem@batch54.pk', name: 'Tariq Nadeem',
    },
  ],
  53: [
    {
      id: 'bilal.siddiqui', username: 'bilal.siddiqui', email: 'bilal.s@batch53.pk', name: 'Bilal Siddiqui',
    },
    {
      id: 'amna.qureshi', username: 'amna.qureshi', email: 'amna.q@batch53.pk', name: 'Amna Qureshi',
    },
    {
      id: 'noman.haider', username: 'noman.haider', email: 'noman.h@batch53.pk', name: 'Noman Haider',
    },
    {
      id: 'hina.baig', username: 'hina.baig', email: 'hina.baig@batch53.pk', name: 'Hina Baig',
    },
    {
      id: 'shahzad.raza', username: 'shahzad.raza', email: 'shahzad.r@batch53.pk', name: 'Shahzad Raza',
    },
  ],
  52: [
    {
      id: 'rabia.iqbal', username: 'rabia.iqbal', email: 'rabia.iqbal@batch52.pk', name: 'Rabia Iqbal',
    },
    {
      id: 'kashif.rehman', username: 'kashif.rehman', email: 'kashif.r@batch52.pk', name: 'Kashif Rehman',
    },
    {
      id: 'sadia.anwar', username: 'sadia.anwar', email: 'sadia.a@batch52.pk', name: 'Sadia Anwar',
    },
  ],
  51: [
    {
      id: 'asim.chaudhry', username: 'asim.chaudhry', email: 'asim.c@batch51.pk', name: 'Asim Chaudhry',
    },
    {
      id: 'maryam.hussain', username: 'maryam.hussain', email: 'maryam.h@batch51.pk', name: 'Maryam Hussain',
    },
    {
      id: 'imtiaz.ali', username: 'imtiaz.ali', email: 'imtiaz.ali@batch51.pk', name: 'Imtiaz Ali',
    },
    {
      id: 'shazia.sohail', username: 'shazia.sohail', email: 'shazia.s@batch51.pk', name: 'Shazia Sohail',
    },
  ],
};

export const getBatches = async (): Promise<Batch[]> => {
  await new Promise<void>((res) => { setTimeout(res, 300); });
  return MOCK_BATCHES;
};

export const getBatchUsers = async (batchId: string): Promise<Learner[]> => {
  await new Promise<void>((res) => { setTimeout(res, 400); });
  return MOCK_BATCH_USERS[batchId] ?? [];
};
