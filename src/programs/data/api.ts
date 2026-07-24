// When backend APIs are ready this is the ONLY file that changed.
// All components call only the hooks in apiHooks.ts.

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type {
  FbrRole,
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
  CreateFeedbackFormInput,
  FeedbackFiltersState,
  FeedbackDashboardInitiationOption,
  FeedbackDashboardComment,
  FeedbackDashboardCommentsResponse,
  FeedbackDashboardCommentUser,
  FeedbackDashboardCriterion,
  FeedbackDashboardReport,
  FeedbackDashboardSummary,
  RatingDistribution,
  RatingDistributionBucket,
  FeedbackFormQuestion,
  FeedbackFormTemplate,
  FeedbackRequest,
  InitiateFeedbackPayload,
  CertificateConfig,
  CertificateRosterRow,
  AwardResult,
} from './types';

export { getCurrentFbrProfile, getCurrentFbrProfileUrl } from '@src/fbr-access/api';

const getProgramsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/programs`;
const getFeedbackBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/cms/feedback`;
const getEncodedProgramId = (programId: string) => encodeURIComponent(programId);
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
  assignedProgramKey: d.assigned_program_key ?? null,
  assignedProgramName: d.assigned_program_name ?? null,
  cmsRerunUrl: d.cms_rerun_url ?? null,
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
  availableForProgram?: string;
  assignedToOtherProgram?: string;
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
        ...(params.availableForProgram ? { available_for_program: params.availableForProgram } : {}),
        ...(params.assignedToOtherProgram ? { assigned_to_other_program: params.assignedToOtherProgram } : {}),
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
  pageSize?: number;
}

export interface GetLearnersParams {
  page?: number;
  search?: string;
  programKey?: string;
  pageSize?: number;
}

export type PlatformUserRole = FbrRole | 'learner';

// Shared mapping from UserSerializer response ({id, username, email, first_name, last_name})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (d: any): Learner => ({
  id: d.username,
  username: d.username,
  email: d.email,
  name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username,
});

// ── Response → Feedback types transformation ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackQuestion = (d: any): FeedbackFormQuestion => ({
  id: d.id,
  type: d.question_type ?? d.type,
  question: d.question,
  required: d.required,
  isDefault: d.is_default ?? d.isDefault ?? false,
  order: d.order,
});

const toFeedbackQuestionPayload = (question: FeedbackFormQuestion, index: number) => ({
  question: question.question,
  question_type: question.type,
  required: question.required,
  is_default: question.isDefault,
  order: question.order ?? index,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackForm = (d: any): FeedbackFormTemplate => ({
  id: d.id,
  name: d.name,
  questions: d.questions?.map(toFeedbackQuestion),
  isInUse: d.is_in_use ?? false,
  createdByName: d.created_by_name,
  created: d.created,
  modified: d.modified,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackResponseAnswer = (d: any) => ({
  id: d.id,
  questionId: d.question_id ?? d.question,
  question: d.question_snapshot,
  type: d.question_type_snapshot,
  starValue: d.star_value,
  textValue: d.text_value,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackUser = (value: any, fallback: any = {}) => {
  const user = value && typeof value === 'object' ? value : {};
  const roles = Array.isArray(user.roles)
    ? user.roles
    : [fallback.role].filter(Boolean);

  return {
    id: user.id ?? (typeof value === 'number' ? value : fallback.id),
    name: user.name ?? fallback.name ?? '',
    email: user.email ?? fallback.email ?? null,
    avatar: user.avatar ?? fallback.avatar ?? null,
    roles,
    role: roles[0] ?? fallback.role ?? null,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackRequest = (d: any): FeedbackRequest => {
  const subject = toFeedbackUser(d.subject ?? d.instructor, {
    id: d.subject ?? d.instructor ?? null,
    name: d.subject_name ?? d.instructor_name ?? null,
    email: d.subject_email ?? d.instructor_email ?? null,
    avatar: d.subject_avatar ?? d.instructor_avatar ?? null,
    role: d.subject_role ?? d.instructor_role ?? null,
  });
  const reviewer = toFeedbackUser(d.reviewer ?? d.trainee, {
    id: d.reviewer ?? d.trainee,
    name: d.reviewer_name ?? d.trainee_name,
    email: d.reviewer_email ?? d.trainee_email ?? null,
    avatar: d.reviewer_avatar ?? d.trainee_avatar ?? null,
    role: d.reviewer_role ?? d.trainee_role ?? null,
  });
  const requestedBy = toFeedbackUser(d.requested_by, {
    id: d.requested_by,
    name: d.requested_by_name,
    email: d.requested_by_email ?? null,
    avatar: d.requested_by_avatar ?? null,
    role: d.requested_by_role ?? null,
  });

  return {
    id: d.id,
    feedbackName: d.feedback_name,
    formId: d.form,
    formName: d.form_name,
    subjectId: subject.id ?? null,
    subjectName: subject.name || null,
    subjectRole: subject.role,
    subjectRoles: subject.roles,
    subjectEmail: subject.email,
    subjectAvatar: subject.avatar,
    reviewerId: reviewer.id,
    reviewerName: reviewer.name,
    reviewerRole: reviewer.role,
    reviewerRoles: reviewer.roles,
    reviewerEmail: reviewer.email,
    reviewerAvatar: reviewer.avatar,
    courseId: d.course_id,
    deadline: d.deadline,
    requestedById: requestedBy.id,
    requestedByName: requestedBy.name,
    requestedByRole: requestedBy.role,
    requestedByRoles: requestedBy.roles,
    requestedByEmail: requestedBy.email,
    requestedByAvatar: requestedBy.avatar,
    submittedAt: d.submitted_at,
    status: d.status,
    response: d.response ? {
      submittedAt: d.response.submitted_at,
      answers: (d.response.answers ?? []).map(toFeedbackResponseAnswer),
    } : null,
    created: d.created,
  };
};

const emptyRatingBucket = (): RatingDistributionBucket => ({
  count: 0,
  percentage: 0,
});

const getDashboardBucket = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  distribution: any,
  backendKey: string,
): RatingDistributionBucket => ({
  count: distribution?.[backendKey]?.count ?? 0,
  percentage: distribution?.[backendKey]?.percentage ?? 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDashboardDistribution = (distribution: any): RatingDistribution => ({
  total: distribution?.total ?? 0,
  excellent: getDashboardBucket(distribution, 'excellent'),
  veryGood: getDashboardBucket(distribution, 'very_good'),
  good: getDashboardBucket(distribution, 'good'),
  needsAttention: getDashboardBucket(distribution, 'needs_attention'),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDashboardDistribution = (distributions: any, criterionId: string): RatingDistribution => (
  distributions?.[criterionId] ? toDashboardDistribution(distributions[criterionId]) : {
    total: 0,
    excellent: emptyRatingBucket(),
    veryGood: emptyRatingBucket(),
    good: emptyRatingBucket(),
    needsAttention: emptyRatingBucket(),
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackDashboardInitiationOption = (d: any): FeedbackDashboardInitiationOption => ({
  id: d.id,
  feedbackName: d.feedback_name,
  selectionValue: d.selection_value ?? d.feedback_name,
  formId: d.form_id,
  formName: d.form_name,
  programKey: d.program_key,
  programName: d.program_name,
  deadline: d.deadline,
  created: d.created,
  totalRequests: d.total_requests ?? 0,
  submittedResponses: d.submitted_responses ?? 0,
  responseRate: d.response_rate ?? 0,
  subjectCount: d.subject_count ?? 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackDashboardSummary = (d: any): FeedbackDashboardSummary => ({
  subjectCount: d?.subject_count ?? 0,
  submittedResponses: d?.submitted_responses ?? 0,
  responseRate: d?.response_rate ?? 0,
  averageRating: d?.average_rating ?? 0,
  topSubjectName: d?.top_subject?.name ?? '--',
  topSubjectRating: d?.top_subject?.rating ?? 0,
  needsAttentionCount: d?.needs_attention_count ?? 0,
});

type ApiRecord = Record<string, unknown>;

const isApiRecord = (value: unknown): value is ApiRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const toApiRecord = (value: unknown): ApiRecord => (isApiRecord(value) ? value : {});

const getStringValue = (record: ApiRecord, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

const getNumberValue = (record: ApiRecord, key: string): number | undefined => {
  const value = record[key];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }
  return undefined;
};

const getStringOrNumberValue = (record: ApiRecord, key: string): string | number | undefined => {
  const value = record[key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
};

const getStringArrayValue = (record: ApiRecord, key: string): string[] => {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const getArrayValue = (record: ApiRecord, key: string): unknown[] => {
  const value = record[key];
  return Array.isArray(value) ? value : [];
};

const toFeedbackDashboardCommentUser = (value: unknown): FeedbackDashboardCommentUser => {
  const d = toApiRecord(value);
  const firstName = getStringValue(d, 'first_name');
  const lastName = getStringValue(d, 'last_name');
  const name = getStringValue(d, 'name')
    || [firstName, lastName].filter(Boolean).join(' ')
    || getStringValue(d, 'username')
    || getStringValue(d, 'email')
    || 'Unknown user';
  const roles = getStringArrayValue(d, 'roles');
  const role = getStringValue(d, 'role');
  const resolvedRoles = roles.length > 0 ? roles : [];
  if (resolvedRoles.length === 0 && role) {
    resolvedRoles.push(role);
  }

  return {
    id: getStringOrNumberValue(d, 'id') ?? getStringValue(d, 'email') ?? name,
    name,
    email: getStringValue(d, 'email'),
    avatar: getStringValue(d, 'avatar') ?? null,
    roles: resolvedRoles,
  };
};

const toFeedbackDashboardComment = (value: unknown): FeedbackDashboardComment => {
  const d = toApiRecord(value);
  const reviewer = toApiRecord(d.reviewer);
  const fallbackId = `${getStringOrNumberValue(reviewer, 'id') ?? 'reviewer'}-${
    getStringValue(d, 'created_at') ?? getStringValue(d, 'createdAt') ?? getStringValue(d, 'comment') ?? ''
  }`;

  return {
    id: getStringOrNumberValue(d, 'id') ?? fallbackId,
    reviewer: toFeedbackDashboardCommentUser(d.reviewer),
    rating: getNumberValue(d, 'rating') ?? null,
    criterionId: getStringValue(d, 'criterion_id') ?? getStringValue(d, 'criterionId'),
    criterionLabel: getStringValue(d, 'criterion_label') ?? getStringValue(d, 'criterionLabel'),
    comment: getStringValue(d, 'comment') ?? '',
    createdAt: getStringValue(d, 'created_at') ?? getStringValue(d, 'createdAt'),
  };
};

const toFeedbackDashboardCommentsSummary = (value: unknown) => {
  const d = toApiRecord(value);

  return {
    total: getNumberValue(d, 'total') ?? 0,
    latest: d.latest ? toFeedbackDashboardComment(d.latest) : null,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFeedbackDashboardReport = (d: any, initiationId: number): FeedbackDashboardReport => {
  const criteria: FeedbackDashboardCriterion[] = (d.criteria ?? []).map((criterion: any) => ({
    id: criterion.id,
    label: criterion.label,
    order: criterion.order,
  }));
  const subjects = (d.subjects ?? []).map((subject: any) => ({
    id: String(subject.id),
    name: subject.name,
    email: subject.email,
    role: subject.role,
    avatar: subject.avatar,
    rating: subject.rating,
    submittedResponses: subject.submitted_responses ?? 0,
    totalRequests: subject.total_requests ?? 0,
    distributions: criteria.reduce((acc: Record<string, RatingDistribution>, criterion) => {
      acc[criterion.id] = getDashboardDistribution(subject.distributions, criterion.id);
      return acc;
    }, {}),
    averageDistribution: toDashboardDistribution(subject.average_distribution),
    commentsSummary: toFeedbackDashboardCommentsSummary(subject.comments_summary ?? subject.commentsSummary),
  }));
  const summary = toFeedbackDashboardSummary({
    ...d.summary,
    submitted_responses: d.submitted_responses,
    response_rate: d.response_rate,
  });

  return {
    id: String(initiationId),
    feedbackName: d.feedback_name,
    selectionValue: d.selection_value ?? d.feedback_name,
    programName: d.program?.name ?? '',
    respondentsLabel: `${d.submitted_responses ?? 0} submitted / ${d.total_requests ?? 0} requested`,
    submittedResponses: d.submitted_responses ?? 0,
    totalRequests: d.total_requests ?? 0,
    responseRate: d.response_rate ?? 0,
    criteria,
    subjects,
    summary,
  };
};

const toFeedbackDashboardCommentsResponse = (value: unknown): FeedbackDashboardCommentsResponse => {
  const d = toApiRecord(value);
  const comments = getArrayValue(d, 'comments').map(toFeedbackDashboardComment);

  return {
    subject: toFeedbackDashboardCommentUser(d.subject),
    total: getNumberValue(d, 'total') ?? comments.length,
    comments,
  };
};

// ── Platform users — GET /fbr/api/programs/users/?role=<fbr_role> ───────────
export const getPlatformUsers = async (
  params: { role: PlatformUserRole } & GetLearnersParams,
): Promise<PaginatedLearners> => {
  const pageSize = params.pageSize ?? 5;
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
    name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
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

// ── Feedback forms — GET /fbr/api/cms/feedback/programs/<key>/forms/ ────────
export const getFeedbackForms = async (programId: string): Promise<FeedbackFormTemplate[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/forms/`,
  );
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toFeedbackForm);
};

// ── Feedback form detail — GET /forms/<id>/ ─────────────────────────────────
export const getFeedbackForm = async (
  programId: string,
  formId: number,
): Promise<FeedbackFormTemplate> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/forms/${formId}/`,
  );
  return toFeedbackForm(data);
};

// ── Create feedback form — POST /forms/ ─────────────────────────────────────
export const createFeedbackForm = async (
  programId: string,
  input: CreateFeedbackFormInput,
): Promise<FeedbackFormTemplate> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/forms/`,
    {
      name: input.name,
      questions: input.questions.map(toFeedbackQuestionPayload),
    },
  );
  return toFeedbackForm(data);
};

const toFeedbackRequestParams = (filters: FeedbackFiltersState) => ({
  ...(filters.feedbackName !== 'All' ? { feedback_name: filters.feedbackName } : {}),
  ...(filters.status !== 'All' ? { status: filters.status } : {}),
  ...(filters.subject.trim() ? { subject: filters.subject.trim() } : {}),
  ...(filters.reviewer.trim() ? { reviewer: filters.reviewer.trim() } : {}),
});

// ── Feedback requests — GET /requests/ ──────────────────────────────────────
export const getFeedbackRequests = async (
  programId: string,
  filters: FeedbackFiltersState,
): Promise<FeedbackRequest[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/requests/`,
    { params: toFeedbackRequestParams(filters) },
  );
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toFeedbackRequest);
};

// ── Feedback request detail — GET /requests/<id>/ ───────────────────────────
export const getFeedbackRequest = async (
  programId: string,
  requestId: number,
): Promise<FeedbackRequest> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/requests/${requestId}/`,
  );
  return toFeedbackRequest(data);
};

// ── Initiate feedback requests — POST /requests/initiate/ ───────────────────
export const initiateFeedbackRequests = async (
  programId: string,
  payload: InitiateFeedbackPayload,
): Promise<FeedbackRequest[]> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/requests/initiate/`,
    {
      feedback_name: payload.feedbackName,
      deadline: payload.deadline,
      form_id: payload.formId,
      reviewer_emails: payload.reviewerEmails,
      ...(payload.subjectEmails?.length ? { subject_emails: payload.subjectEmails } : {}),
    },
  );
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toFeedbackRequest);
};

export const getFeedbackDashboardInitiations = async (
  programId: string,
): Promise<FeedbackDashboardInitiationOption[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/dashboard/initiated-feedback/`,
  );
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toFeedbackDashboardInitiationOption);
};

export const getFeedbackDashboardReport = async (
  programId: string,
  initiationId: number,
): Promise<FeedbackDashboardReport> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/dashboard/report/`,
    { params: { initiation_id: initiationId } },
  );
  return toFeedbackDashboardReport(data, initiationId);
};

export const getFeedbackDashboardComments = async (
  programId: string,
  initiationId: number,
  subjectId: string,
): Promise<FeedbackDashboardCommentsResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/dashboard/comments/`,
    { params: { initiation_id: initiationId, subject_id: subjectId } },
  );
  return toFeedbackDashboardCommentsResponse(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Program Certificates — TEMPORARY in-memory mock.
//
// The backend endpoints (fbr/api/cms/certificates/…) are not built yet, so
// these functions resolve against an in-module store instead of the network.
// When the backend ships, replace each function body with the real call shown
// in its comment — no consumer (hooks/components) changes. Delete this block's
// store + seeding at that point.
//
//   GET  {base}/{programId}/config/            → getCertificateConfig
//   PUT  {base}/{programId}/config/            → updateCertificateConfig
//   GET  {base}/{programId}/awards/            → getCertificateRoster
//   POST {base}/{programId}/awards/            → awardCertificates
//   POST {base}/awards/{number}/revoke/        → revokeCertificate
//   where {base} = `${STUDIO_BASE_URL}/fbr/api/cms/certificates`
// ─────────────────────────────────────────────────────────────────────────

const MOCK_LATENCY_MS = 350;
const mockDelay = <T>(value: T): Promise<T> => new Promise((resolve) => {
  setTimeout(() => resolve(value), MOCK_LATENCY_MS);
});

const mockCertificateConfigs: Record<string, CertificateConfig> = {};
// Roster + awards, seeded per program on first access.
const mockRosters: Record<string, CertificateRosterRow[]> = {};

const MOCK_DEFAULT_CONFIG: CertificateConfig = {
  issuedBy: 'Directorate of Training (Direct Taxes), FBR',
  signatories: [
    { name: 'Muhammad Ashfaq Ahmed', title: 'Director General, Directorate of Training' },
    { name: 'Saira Kamal', title: 'Chief Coordinator, STP' },
  ],
};

const MOCK_TRAINEES: Array<{ username: string; fullName: string; percent: number; awarded?: boolean }> = [
  {
    username: 'ifrah.saleem', fullName: 'Ifrah Saleem', percent: 97, awarded: true,
  },
  {
    username: 'ayesha.tariq', fullName: 'Ayesha Tariq', percent: 94, awarded: true,
  },
  { username: 'tania.bashir', fullName: 'Tania Bashir', percent: 90 },
  { username: 'zoya.iqbal', fullName: 'Zoya Iqbal', percent: 86 },
  { username: 'qasim.raza', fullName: 'Qasim Raza', percent: 85 },
  { username: 'kiran.rashid', fullName: 'Kiran Rashid', percent: 82 },
  { username: 'wajeeha.noor', fullName: 'Wajeeha Noor', percent: 79 },
  { username: 'omer.siddiqui', fullName: 'Omer Siddiqui', percent: 77 },
  { username: 'rabia.aslam', fullName: 'Rabia Aslam', percent: 73 },
  { username: 'bilal.hussain', fullName: 'Bilal Hussain', percent: 71 },
  { username: 'parveen.akhtar', fullName: 'Parveen Akhtar', percent: 68 },
  { username: 'usman.ghani', fullName: 'Usman Ghani', percent: 66 },
  { username: 'hassan.mehmood', fullName: 'Hassan Mehmood', percent: 63 },
  { username: 'jawad.ali', fullName: 'Jawad Ali', percent: 55 },
  { username: 'naila.qureshi', fullName: 'Naila Qureshi', percent: 46 },
  { username: 'salman.haider', fullName: 'Salman Haider', percent: 42 },
];

const mockCertificateNumber = (username: string): string => `FBR-CERT-${username.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase().padEnd(6, '0')}`;

const seedMockRoster = (programId: string): CertificateRosterRow[] => {
  if (!mockRosters[programId]) {
    mockRosters[programId] = MOCK_TRAINEES.map((trainee) => ({
      username: trainee.username,
      fullName: trainee.fullName,
      avatarUrl: null,
      percent: trainee.percent.toFixed(1),
      result: trainee.percent >= 50 ? 'pass' : 'fail',
      status: 'finalized',
      certificate: trainee.awarded
        ? {
          certificateNumber: mockCertificateNumber(trainee.username),
          status: 'active',
          issuedAt: '2026-06-18T00:00:00Z',
        }
        : null,
    }));
  }
  return mockRosters[programId];
};

export const getCertificateConfig = async (programId: string): Promise<CertificateConfig> => {
  // Real: const { data } = await getAuthenticatedHttpClient().get(
  //   `${STUDIO_BASE_URL}/fbr/api/cms/certificates/${getEncodedProgramId(programId)}/config/`);
  //   return { issuedBy: data.issued_by, signatories: data.signatories ?? [] };
  const config = mockCertificateConfigs[programId] ?? MOCK_DEFAULT_CONFIG;
  return mockDelay({ issuedBy: config.issuedBy, signatories: [...config.signatories] });
};

export const updateCertificateConfig = async (
  programId: string,
  config: CertificateConfig,
): Promise<CertificateConfig> => {
  // Real: await getAuthenticatedHttpClient().put(`…/${getEncodedProgramId(programId)}/config/`,
  //   { issued_by: config.issuedBy, signatories: config.signatories }); return config;
  mockCertificateConfigs[programId] = {
    issuedBy: config.issuedBy,
    signatories: config.signatories.map((s) => ({ ...s })),
  };
  return mockDelay(mockCertificateConfigs[programId]);
};

// Real: GET `…/${getEncodedProgramId(programId)}/awards/` → (data.results ?? data).map(toRosterRow)
export const getCertificateRoster = async (programId: string): Promise<CertificateRosterRow[]> => mockDelay(
  seedMockRoster(programId).map((row) => ({ ...row })),
);
export const awardCertificates = async (
  programId: string,
  usernames: string[],
): Promise<AwardResult> => {
  // Real: const { data } = await getAuthenticatedHttpClient().post(
  //   `…/${getEncodedProgramId(programId)}/awards/`, { usernames }); return data;
  const roster = seedMockRoster(programId);
  const ok: string[] = [];
  usernames.forEach((username) => {
    const row = roster.find((r) => r.username === username);
    if (row && !row.certificate) {
      row.certificate = {
        certificateNumber: mockCertificateNumber(username),
        status: 'active',
        issuedAt: new Date().toISOString(),
      };
      ok.push(row.certificate.certificateNumber);
    }
  });
  return mockDelay({ ok, errors: [] });
};

export const revokeCertificate = async (certificateNumber: string): Promise<void> => {
  // Real: await getAuthenticatedHttpClient().post(
  //   `…/awards/${encodeURIComponent(certificateNumber)}/revoke/`);
  Object.values(mockRosters).forEach((roster) => {
    const match = roster.find((r) => r.certificate?.certificateNumber === certificateNumber);
    if (match) {
      match.certificate = null;
    }
  });
  return mockDelay(undefined);
};
