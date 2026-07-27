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
} from './types';

export { getCurrentFbrProfile, getCurrentFbrProfileUrl } from '@src/fbr-access/api';

const getProgramsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/programs`;
const getFeedbackBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/cms/feedback`;
const getEncodedProgramId = (programId: string) => encodeURIComponent(programId);
export const getFbrCitiesUrl = () => `${getConfig().LMS_BASE_URL}/fbr/api/biodata/v1/users/cities/`;

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

const getBooleanValue = (record: ApiRecord, key: string): boolean | undefined => {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
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

const getResultsArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return getArrayValue(toApiRecord(value), 'results');
};

const mapOptionalArray = <T>(
  record: ApiRecord,
  key: string,
  mapper: (item: unknown) => T,
): T[] | undefined => {
  const value = record[key];
  return Array.isArray(value) ? value.map(mapper) : undefined;
};

export const getFbrCities = async (): Promise<CityOption[]> => {
  const { data } = await getAuthenticatedHttpClient().get(getFbrCitiesUrl());
  return Array.isArray(data) ? data : [];
};

// ── Response → Course type transformation ────────────────────────────────────
const toCourse = (value: unknown): Course => {
  const d = toApiRecord(value);
  const targetAudience = toApiRecord(d.target_audience);

  return {
    id: getStringValue(d, 'course_key') ?? '',
    displayName: getStringValue(d, 'display_name') ?? '',
    org: getStringValue(d, 'org') ?? '',
    run: getStringValue(d, 'run') ?? '',
    targetAudience: getStringValue(targetAudience, 'name') ?? '',
  };
};

// ── Response → Program type transformation ──────────────────────────────────
// SlugRelatedField serializes FK as string (short_name / slug), not an object.
// target_audience is a FK returning {id, name}; target_audiences is the full list.
const toProgram = (value: unknown): Program => {
  const d = toApiRecord(value);
  const targetAudience = toApiRecord(d.target_audience);
  const city = toApiRecord(d.city);

  return {
    id: getStringValue(d, 'program_key') ?? '',
    displayName: getStringValue(d, 'name') ?? '',
    org: getStringValue(d, 'organization') ?? '',
    programType: getStringValue(d, 'program_type') ?? '',
    run: getStringValue(d, 'batch') ?? '',
    targetAudience: getStringValue(targetAudience, 'name') ?? '',
    city: getStringOrNumberValue(city, 'id') !== undefined ? String(getStringOrNumberValue(city, 'id')) : '',
    shortDescription: getStringValue(d, 'description') ?? '',
    longDescription: getStringValue(d, 'long_description') ?? '',
    status: getStringValue(d, 'status') ?? 'draft',
    isFeatured: getBooleanValue(d, 'is_featured') ?? false,
    startDate: getStringValue(d, 'start_date') ?? '',
    endDate: getStringValue(d, 'end_date') ?? '',
    image: getStringValue(d, 'card_image') ?? '',
    courses: getArrayValue(d, 'courses').map(toCourse),
  };
};

// ── Config — GET /fbr/api/programs/config/ ───────────────────────────────────
export const getProgramsConfig = async (): Promise<ProgramConfig> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/config/`);
  const response = toApiRecord(data);
  return {
    orgs: getArrayValue(response, 'organizations').map((item) => {
      const org = toApiRecord(item);
      return {
        id: getNumberValue(org, 'id') ?? 0,
        name: getStringValue(org, 'name') ?? '',
        shortName: getStringValue(org, 'short_name') ?? '',
      };
    }),
    programTypes: getArrayValue(response, 'program_types').map((item) => {
      const programType = toApiRecord(item);
      return {
        id: getNumberValue(programType, 'id') ?? 0,
        name: getStringValue(programType, 'name') ?? '',
        slug: getStringValue(programType, 'slug') ?? '',
      };
    }),
    cities: getArrayValue(response, 'cities').map((item) => {
      const city = toApiRecord(item);
      return {
        id: getNumberValue(city, 'id') ?? 0,
        name: getStringValue(city, 'name') ?? '',
      };
    }),
    // Statuses are stable constants; not returned by config endpoint
    statuses: ['draft', 'active', 'archived', 'freezed'],
  };
};

// ── List — GET /fbr/api/programs/ ────────────────────────────────────────────
export const getPrograms = async (): Promise<Program[]> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/`);
  // Handle both paginated { results: [...] } and flat array responses
  return getResultsArray(data).map(toProgram);
};

// ── Detail — GET /fbr/api/programs/<program_key>/ ───────────────────────────
export const getProgramDetail = async (programId: string): Promise<ProgramDetailResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getProgramsBaseUrl()}/${programId}/`);
  const response = toApiRecord(data);
  return {
    program: toProgram(data),
    // target_audiences in the detail response is the full list of all audiences system-wide
    availableAudiences: getArrayValue(response, 'target_audiences')
      .map((item) => getStringValue(toApiRecord(item), 'name') ?? ''),
    // cities in the detail response is the full list of all cities
    availableCities: getArrayValue(response, 'cities').map((item) => {
      const city = toApiRecord(item);
      return {
        id: getNumberValue(city, 'id') ?? 0,
        name: getStringValue(city, 'name') ?? '',
      };
    }),
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
  const response = toApiRecord(data);
  const pagination = toApiRecord(response.pagination);
  const count = getNumberValue(pagination, 'count') ?? 0;
  return {
    results: getArrayValue(response, 'results').map(toCourse),
    count,
    numPages: getNumberValue(pagination, 'num_pages') ?? (Math.ceil(count / pageSize) || 1),
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
  return getResultsArray(data).map((item) => getStringValue(toApiRecord(item), 'name') ?? '');
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
const toUser = (value: unknown): Learner => {
  const d = toApiRecord(value);
  const username = getStringValue(d, 'username') ?? '';
  const firstName = getStringValue(d, 'first_name');
  const lastName = getStringValue(d, 'last_name');

  return {
    id: username,
    username,
    email: getStringValue(d, 'email') ?? '',
    name: [firstName, lastName].filter(Boolean).join(' ') || username,
  };
};

// ── Response → Feedback types transformation ────────────────────────────────
const toFeedbackQuestion = (value: unknown): FeedbackFormQuestion => {
  const d = toApiRecord(value);

  return {
    id: getNumberValue(d, 'id') ?? 0,
    type: (getStringValue(d, 'question_type') ?? getStringValue(d, 'type') ?? 'star_rating') as FeedbackFormQuestion['type'],
    question: getStringValue(d, 'question') ?? '',
    required: getBooleanValue(d, 'required') ?? false,
    isDefault: getBooleanValue(d, 'is_default') ?? getBooleanValue(d, 'isDefault') ?? false,
    order: getNumberValue(d, 'order'),
  };
};

const toFeedbackQuestionPayload = (question: FeedbackFormQuestion, index: number) => ({
  question: question.question,
  question_type: question.type,
  required: question.required,
  is_default: question.isDefault,
  order: question.order ?? index,
});

const toFeedbackForm = (value: unknown): FeedbackFormTemplate => {
  const d = toApiRecord(value);

  return {
    id: getNumberValue(d, 'id') ?? 0,
    name: getStringValue(d, 'name') ?? '',
    questions: mapOptionalArray(d, 'questions', toFeedbackQuestion),
    isInUse: getBooleanValue(d, 'is_in_use') ?? false,
    createdByName: getStringValue(d, 'created_by_name'),
    created: getStringValue(d, 'created'),
    modified: getStringValue(d, 'modified'),
  };
};

const toFeedbackResponseAnswer = (value: unknown) => {
  const d = toApiRecord(value);

  return {
    id: getNumberValue(d, 'id') ?? 0,
    questionId: getNumberValue(d, 'question_id') ?? getNumberValue(d, 'question'),
    question: getStringValue(d, 'question_snapshot') ?? '',
    type: (getStringValue(d, 'question_type_snapshot') ?? 'star_rating') as FeedbackFormQuestion['type'],
    starValue: getNumberValue(d, 'star_value') ?? null,
    textValue: getStringValue(d, 'text_value') ?? null,
  };
};

const toFeedbackUser = (value: unknown, fallbackValue: unknown = {}) => {
  const user = toApiRecord(value);
  const fallback = toApiRecord(fallbackValue);
  const fallbackRole = getStringValue(fallback, 'role');
  const roles = getStringArrayValue(user, 'roles');
  const resolvedRoles = roles.length > 0
    ? roles
    : [fallbackRole].filter((role): role is string => Boolean(role));

  return {
    id: getNumberValue(user, 'id')
      ?? (typeof value === 'number' ? value : getNumberValue(fallback, 'id')),
    name: getStringValue(user, 'name') ?? getStringValue(fallback, 'name') ?? '',
    email: getStringValue(user, 'email') ?? getStringValue(fallback, 'email') ?? null,
    avatar: getStringValue(user, 'avatar') ?? getStringValue(fallback, 'avatar') ?? null,
    roles: resolvedRoles,
    role: resolvedRoles[0] ?? fallbackRole ?? null,
  };
};

const toFeedbackRequest = (value: unknown): FeedbackRequest => {
  const d = toApiRecord(value);
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
  const response = toApiRecord(d.response);

  return {
    id: getNumberValue(d, 'id') ?? 0,
    feedbackName: getStringValue(d, 'feedback_name') ?? '',
    formId: getNumberValue(d, 'form') ?? 0,
    formName: getStringValue(d, 'form_name') ?? '',
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
    courseId: getStringValue(d, 'course_id') ?? '',
    deadline: getStringValue(d, 'deadline') ?? '',
    requestedById: requestedBy.id,
    requestedByName: requestedBy.name,
    requestedByRole: requestedBy.role,
    requestedByRoles: requestedBy.roles,
    requestedByEmail: requestedBy.email,
    requestedByAvatar: requestedBy.avatar,
    submittedAt: getStringValue(d, 'submitted_at') ?? null,
    status: (getStringValue(d, 'status') ?? 'Pending') as FeedbackRequest['status'],
    response: isApiRecord(d.response) ? {
      submittedAt: getStringValue(response, 'submitted_at') ?? '',
      answers: getArrayValue(response, 'answers').map(toFeedbackResponseAnswer),
    } : null,
    created: getStringValue(d, 'created') ?? '',
  };
};

const emptyRatingBucket = (): RatingDistributionBucket => ({
  count: 0,
  percentage: 0,
});

const getDashboardBucket = (
  distribution: unknown,
  backendKey: string,
): RatingDistributionBucket => {
  const bucket = toApiRecord(toApiRecord(distribution)[backendKey]);

  return {
    count: getNumberValue(bucket, 'count') ?? 0,
    percentage: getNumberValue(bucket, 'percentage') ?? 0,
  };
};

const toDashboardDistribution = (distribution: unknown): RatingDistribution => {
  const d = toApiRecord(distribution);

  return {
    total: getNumberValue(d, 'total') ?? 0,
    excellent: getDashboardBucket(d, 'excellent'),
    veryGood: getDashboardBucket(d, 'very_good'),
    good: getDashboardBucket(d, 'good'),
    needsAttention: getDashboardBucket(d, 'needs_attention'),
  };
};

const getDashboardDistribution = (distributions: unknown, criterionId: string): RatingDistribution => {
  const d = toApiRecord(distributions);

  return d[criterionId] ? toDashboardDistribution(d[criterionId]) : {
    total: 0,
    excellent: emptyRatingBucket(),
    veryGood: emptyRatingBucket(),
    good: emptyRatingBucket(),
    needsAttention: emptyRatingBucket(),
  };
};

const toFeedbackDashboardInitiationOption = (value: unknown): FeedbackDashboardInitiationOption => {
  const d = toApiRecord(value);

  return {
    id: getNumberValue(d, 'id') ?? 0,
    feedbackName: getStringValue(d, 'feedback_name') ?? '',
    selectionValue: getStringValue(d, 'selection_value') ?? getStringValue(d, 'feedback_name') ?? '',
    formId: getNumberValue(d, 'form_id') ?? 0,
    formName: getStringValue(d, 'form_name') ?? '',
    programKey: getStringValue(d, 'program_key') ?? '',
    programName: getStringValue(d, 'program_name') ?? '',
    deadline: getStringValue(d, 'deadline') ?? '',
    created: getStringValue(d, 'created') ?? '',
    totalRequests: getNumberValue(d, 'total_requests') ?? 0,
    submittedResponses: getNumberValue(d, 'submitted_responses') ?? 0,
    responseRate: getNumberValue(d, 'response_rate') ?? 0,
    subjectCount: getNumberValue(d, 'subject_count') ?? 0,
  };
};

const toFeedbackDashboardSummary = (value: unknown): FeedbackDashboardSummary => {
  const d = toApiRecord(value);
  const topSubject = toApiRecord(d.top_subject);

  return {
    subjectCount: getNumberValue(d, 'subject_count') ?? 0,
    submittedResponses: getNumberValue(d, 'submitted_responses') ?? 0,
    responseRate: getNumberValue(d, 'response_rate') ?? 0,
    averageRating: getNumberValue(d, 'average_rating') ?? 0,
    topSubjectName: getStringValue(topSubject, 'name') ?? '--',
    topSubjectRating: getNumberValue(topSubject, 'rating') ?? 0,
    needsAttentionCount: getNumberValue(d, 'needs_attention_count') ?? 0,
  };
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

const toFeedbackDashboardReport = (value: unknown, initiationId: number): FeedbackDashboardReport => {
  const d = toApiRecord(value);
  const criteria: FeedbackDashboardCriterion[] = getArrayValue(d, 'criteria').map((item) => {
    const criterion = toApiRecord(item);
    return {
      id: String(getStringOrNumberValue(criterion, 'id') ?? ''),
      label: getStringValue(criterion, 'label') ?? '',
      order: getNumberValue(criterion, 'order'),
    };
  });
  const subjects = getArrayValue(d, 'subjects').map((item) => {
    const subject = toApiRecord(item);

    return {
      id: String(getStringOrNumberValue(subject, 'id') ?? ''),
      name: getStringValue(subject, 'name') ?? '',
      email: getStringValue(subject, 'email'),
      role: getStringValue(subject, 'role'),
      avatar: getStringValue(subject, 'avatar'),
      rating: getNumberValue(subject, 'rating') ?? null,
      submittedResponses: getNumberValue(subject, 'submitted_responses') ?? 0,
      totalRequests: getNumberValue(subject, 'total_requests') ?? 0,
      distributions: criteria.reduce((acc: Record<string, RatingDistribution>, criterion) => {
        acc[criterion.id] = getDashboardDistribution(subject.distributions, criterion.id);
        return acc;
      }, {}),
      averageDistribution: toDashboardDistribution(subject.average_distribution),
      commentsSummary: toFeedbackDashboardCommentsSummary(subject.comments_summary ?? subject.commentsSummary),
    };
  });
  const summaryData = toApiRecord(d.summary);
  const summary = toFeedbackDashboardSummary({
    ...summaryData,
    submitted_responses: d.submitted_responses,
    response_rate: d.response_rate,
  });
  const program = toApiRecord(d.program);

  return {
    id: String(initiationId),
    feedbackName: getStringValue(d, 'feedback_name') ?? '',
    selectionValue: getStringValue(d, 'selection_value') ?? getStringValue(d, 'feedback_name'),
    programName: getStringValue(program, 'name') ?? '',
    respondentsLabel: `${getNumberValue(d, 'submitted_responses') ?? 0} submitted / ${getNumberValue(d, 'total_requests') ?? 0} requested`,
    submittedResponses: getNumberValue(d, 'submitted_responses') ?? 0,
    totalRequests: getNumberValue(d, 'total_requests') ?? 0,
    responseRate: getNumberValue(d, 'response_rate') ?? 0,
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
  const response = toApiRecord(data);
  const pagination = toApiRecord(response.pagination);
  const count = getNumberValue(pagination, 'count') ?? 0;
  return {
    results: getArrayValue(response, 'results').map(toUser),
    count,
    numPages: getNumberValue(pagination, 'num_pages') ?? (Math.ceil(count / pageSize) || 1),
  };
};

// ── Course team — GET /fbr/api/programs/courses/<course_key>/team/ ─────────
const toInstructor = (value: unknown): Instructor => {
  const d = toApiRecord(value);

  return {
    id: getStringValue(d, 'username') ?? '',
    username: getStringValue(d, 'username') ?? '',
    email: getStringValue(d, 'email') ?? '',
    role: getStringValue(d, 'role'),
    name: getStringValue(d, 'full_name') ?? '',
  };
};

export const getCourseTeam = async (courseId: string): Promise<Instructor[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/courses/${encodeURIComponent(courseId)}/team/`,
  );
  return getResultsArray(data).map(toInstructor);
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
  const response = toApiRecord(data);
  const pagination = toApiRecord(response.pagination);
  const count = getNumberValue(pagination, 'count') ?? 0;
  return {
    results: getArrayValue(response, 'results').map(toUser),
    count,
    numPages: getNumberValue(pagination, 'num_pages') ?? (Math.ceil(count / pageSize) || 1),
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
  return getResultsArray(data).map(toFeedbackForm);
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
  return getResultsArray(data).map(toFeedbackRequest);
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
  return getResultsArray(data).map(toFeedbackRequest);
};

export const getFeedbackDashboardInitiations = async (
  programId: string,
): Promise<FeedbackDashboardInitiationOption[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getFeedbackBaseUrl()}/programs/${getEncodedProgramId(programId)}/dashboard/initiated-feedback/`,
  );
  return getResultsArray(data).map(toFeedbackDashboardInitiationOption);
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
};
