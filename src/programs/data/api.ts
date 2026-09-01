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
  PaginatedPrograms,
  Program,
  ProgramConfig,
  ProgramDetailResponse,
} from './types';

const getProgramsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/rwaq/api/programs`;

// Safety bound on getPrograms()'s page walk. At the API's page_size of 10 this
// allows 5,000 programs, while still guaranteeing the loop terminates if the
// API returns an inconsistent count/page_size pair.
const MAX_LIST_PAGES = 500;

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
  introVideoId: d.intro_video_id ?? '',
  status: d.status ?? 'draft',
  isFeatured: d.is_featured ?? false,
  startDate: d.start_date ?? '',
  endDate: d.end_date ?? '',
  image: d.card_image ?? '',
  courses: d.courses?.map(toCourse) ?? [],
  isPaid: d.is_paid ?? false,
  pricingMode: d.pricing_mode ?? 'collective',
  customPrice: d.custom_price ?? null,
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
// The endpoint paginates at 10 per page and supports ?search=, ?ordering= and
// ?status=, so all three are passed through to the server. Filtering
// client-side instead would only ever match within the page already fetched.
export const getProgramsPage = async (
  params: { page?: number; search?: string; ordering?: string; status?: string } = {},
): Promise<PaginatedPrograms> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/`, {
    params: {
      page: params.page,
      search: params.search || undefined,
      ordering: params.ordering,
      // 'all' is a UI-only value; omit it so the server returns every status.
      status: params.status && params.status !== 'all' ? params.status : undefined,
    },
  });

  // rwaq-features' list endpoints use edx_rest_framework_extensions'
  // NamespacedPageNumberPagination, which nests metadata under a "pagination"
  // key rather than DRF's default flat { count, next, results } shape — same
  // convention as getCourses()/getLearners() below. Also handle a flat array
  // response, which means the endpoint isn't paginating at all.
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  const pagination = Array.isArray(data) ? null : data.pagination;

  return {
    results: results.map(toProgram),
    count: pagination?.count ?? results.length,
    numPages: pagination?.num_pages ?? 1,
  };
};

// Every program across all pages, for callers that need the whole list rather
// than a page.
export const getPrograms = async (): Promise<Program[]> => {
  const all: Program[] = [];
  let page = 1;

  // Bounded rather than while(true): a malformed count/page_size pair should
  // degrade to a truncated list, not spin forever against the API.
  for (; page <= MAX_LIST_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { results, numPages } = await getProgramsPage({ page });
    all.push(...results);
    if (page >= numPages) {
      break;
    }
  }

  return all;
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
  if (data.introVideoId !== undefined) { formData.append('intro_video_id', data.introVideoId ?? ''); }
  if (data.status !== undefined) { formData.append('status', data.status ?? 'draft'); }
  if (data.isFeatured !== undefined) { formData.append('is_featured', String(data.isFeatured)); }
  if (data.startDate !== undefined) { formData.append('start_date', data.startDate ?? ''); }
  if (data.endDate !== undefined) { formData.append('end_date', data.endDate ?? ''); }
  if (data.isPaid !== undefined) {
    formData.append('is_paid', String(data.isPaid));
    // pricing_mode and custom_price are only meaningful when is_paid=true
    if (data.isPaid) {
      if (data.pricingMode !== undefined) { formData.append('pricing_mode', data.pricingMode ?? 'collective'); }
      if (data.pricingMode === 'custom' && data.customPrice) { formData.append('custom_price', data.customPrice); }
    }
  }
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
  org?: string;
}

export const getCourses = async (params: GetCoursesParams = {}): Promise<PaginatedCourses> => {
  const pageSize = 5; // temporary — lower for pagination testing; revert to backend default
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/courses/`,
    {
      params: {
        page: params.page ?? 1,
        page_size: pageSize,
        ...(params.search ? { search: params.search } : {}),
        ...(params.org ? { org: params.org } : {}),
      },
    },
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
