import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { PAGE_SIZE } from '../constants';
import type {
  Badge,
  BadgeWriteData,
  CourseGroup,
  CourseGroupWriteData,
  CourseSearchResult,
  Curriculum,
  CurriculumWriteData,
  DeepLink,
  DeepLinkWriteData,
  DeepLinksConfig,
  ManagementStatus,
  Paginated,
  TestLink,
  TestLinkRequest,
} from '../types';

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;

/** A URL under the plugin's Studio prefix, `api/uber/`. */
const makeUberUrl = (path: string, searchParams?: Record<string, string | number>): string => {
  const url = new URL(`api/uber/${path}`, getApiBaseUrl());
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.append(key, String(value)));
  }
  return url.href;
};

const makeUrl = (path: string, searchParams?: Record<string, string | number>): string => (
  makeUberUrl(`curriculum/v1/curriculum-management/${path}`, searchParams)
);

export const apiUrls = {
  status: () => makeUrl('status/'),
  courses: (search: string, pageNumber = 1) => makeUrl('courses/', { search, page: pageNumber }),
  curriculums: () => makeUrl('curriculums/'),
  curriculumsPage: (pageNumber: number) => makeUrl('curriculums/', { page: pageNumber }),
  curriculum: (uuid: string) => makeUrl(`curriculums/${uuid}/`),
  badges: () => makeUrl('badges/'),
  badgesPage: (pageNumber: number) => makeUrl('badges/', { page: pageNumber }),
  badge: (uuid: string) => makeUrl(`badges/${uuid}/`),
  // Course groups and deep links are other sub-apps of the plugin, under their own prefixes.
  courseGroups: () => makeUberUrl('optional-courses/v1/course-groups/'),
  courseGroupsPage: (pageNumber: number) => makeUberUrl('optional-courses/v1/course-groups/', { page: pageNumber }),
  courseGroup: (slug: string) => makeUberUrl(`optional-courses/v1/course-groups/${encodeURIComponent(slug)}/`),
  deepLinksConfig: () => makeUberUrl('deep-links/v1/config/'),
  testLinks: () => makeUberUrl('deep-links/v1/test-links/'),
  deepLinks: () => makeUberUrl('deep-links/v1/links/'),
  deepLinksPage: (pageNumber: number) => makeUberUrl('deep-links/v1/links/', { page: pageNumber }),
  deepLink: (uuid: string) => makeUberUrl(`deep-links/v1/links/${uuid}/`),
};

/**
 * Fetch every page of a DRF page-number-paginated list: page 1 first (to learn `count`),
 * then all remaining pages in parallel. Returns the camelCased, flattened results.
 */
export async function getAllPages<T>(urlForPage: (pageNumber: number) => string): Promise<T[]> {
  const client = getAuthenticatedHttpClient();
  const { data: first } = await client.get<Paginated<unknown>>(urlForPage(1));
  const pageCount = Math.ceil(first.count / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => (
      client.get<Paginated<unknown>>(urlForPage(index + 2)).then(({ data }) => data.results)
    )),
  );
  return camelCaseObject([...first.results, ...rest.flat()]) as T[];
}

export async function getStatus(): Promise<ManagementStatus> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.status());
  return { enabled: !!data.enabled };
}

export const getAllCurriculums = () => getAllPages<Curriculum>(apiUrls.curriculumsPage);
export const getAllBadges = () => getAllPages<Badge>(apiUrls.badgesPage);

export async function searchCourses(search: string): Promise<CourseSearchResult[]> {
  const { data } = await getAuthenticatedHttpClient().get<Paginated<unknown>>(apiUrls.courses(search));
  return camelCaseObject(data.results) as CourseSearchResult[];
}

/** Curriculum writes use multipart/form-data so an image file can be included. */
const toCurriculumFormData = (data: CurriculumWriteData): FormData => {
  const formData = new FormData();
  if (data.slug) {
    formData.append('slug', data.slug);
  }
  formData.append('title', data.title);
  formData.append('description', data.description);
  if (data.image) {
    formData.append('image', data.image);
  } else if (data.removeImage) {
    formData.append('remove_image', 'true');
  }
  data.courseIds.forEach((id) => formData.append('course_ids', id));
  formData.append('knowledge_check_course_id', data.knowledgeCheckCourseId);
  formData.append('knowledge_check_delay_days', String(data.knowledgeCheckDelayDays));
  formData.append('knowledge_check_pass_threshold', String(data.knowledgeCheckPassThreshold));
  formData.append('knowledge_check_max_attempts', String(data.knowledgeCheckMaxAttempts));
  // Always sent: '' is multipart's null (DRF reads it as None for an allow_null field), so a PUT can clear it.
  formData.append('knowledge_check_time_limit', String(data.knowledgeCheckTimeLimit ?? ''));
  // DRF's DictField reads multipart as badges.<slot>; send one key per slot (only when a value is set).
  const BADGE_SLOTS = ['complete', 'retained'] as const;
  BADGE_SLOTS.forEach((slot) => {
    const id = (data.badges as Record<string, string | null | undefined>)?.[slot];
    if (id) { formData.append(`badges.${slot}`, id); }
  });
  return formData;
};

export async function createCurriculum(data: CurriculumWriteData): Promise<Curriculum> {
  const { data: body } = await getAuthenticatedHttpClient().post(apiUrls.curriculums(), toCurriculumFormData(data));
  return camelCaseObject(body) as Curriculum;
}

export async function updateCurriculum(uuid: string, data: CurriculumWriteData): Promise<Curriculum> {
  const { data: body } = await getAuthenticatedHttpClient().put(apiUrls.curriculum(uuid), toCurriculumFormData(data));
  return camelCaseObject(body) as Curriculum;
}

export async function deleteCurriculum(uuid: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.curriculum(uuid));
}

/** Badge writes are multipart; keys are written by hand in snake_case. */
const toBadgeFormData = (data: BadgeWriteData): FormData => {
  const formData = new FormData();
  if (data.kind) {
    formData.append('kind', data.kind);
  }
  formData.append('title', data.title);
  formData.append('description', data.description);
  if (data.image) {
    formData.append('image', data.image);
  } else if (data.removeImage) {
    formData.append('remove_image', 'true');
  }
  if (data.courseIds) {
    // One repeated key per course. Multipart can't express an empty list, so one empty value means "none" (spec §6.4).
    (data.courseIds.length ? data.courseIds : ['']).forEach((courseId) => formData.append('course_ids', courseId));
  }
  return formData;
};

export async function createBadge(data: BadgeWriteData): Promise<Badge> {
  const { data: body } = await getAuthenticatedHttpClient().post(apiUrls.badges(), toBadgeFormData(data));
  return camelCaseObject(body) as Badge;
}

export async function updateBadge(uuid: string, data: BadgeWriteData): Promise<Badge> {
  const { data: body } = await getAuthenticatedHttpClient().patch(apiUrls.badge(uuid), toBadgeFormData(data));
  return camelCaseObject(body) as Badge;
}

export async function deleteBadge(uuid: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.badge(uuid));
}

export const getAllCourseGroups = () => getAllPages<CourseGroup>(apiUrls.courseGroupsPage);

/** Course group writes are JSON; keys are written by hand in snake_case. */
const toCourseGroupBody = (data: CourseGroupWriteData) => ({
  slug: data.slug,
  title: data.title,
  description: data.description,
  course_ids: data.courseIds,
});

export async function createCourseGroup(data: CourseGroupWriteData): Promise<CourseGroup> {
  const { data: body } = await getAuthenticatedHttpClient().post(apiUrls.courseGroups(), toCourseGroupBody(data));
  return camelCaseObject(body) as CourseGroup;
}

export async function updateCourseGroup(slug: string, data: CourseGroupWriteData): Promise<CourseGroup> {
  const { data: body } = await getAuthenticatedHttpClient().put(apiUrls.courseGroup(slug), toCourseGroupBody(data));
  return camelCaseObject(body) as CourseGroup;
}

export async function deleteCourseGroup(slug: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.courseGroup(slug));
}

export const getAllDeepLinks = () => getAllPages<DeepLink>(apiUrls.deepLinksPage);

/** Deep link writes are JSON; keys are written by hand in snake_case. */
const toDeepLinkBody = (data: DeepLinkWriteData) => ({
  title: data.title,
  description: data.description,
  target: data.target,
  course_id: data.courseId,
  path_ids: data.pathIds,
  groups: data.groups,
});

export async function createDeepLink(data: DeepLinkWriteData): Promise<DeepLink> {
  const { data: body } = await getAuthenticatedHttpClient().post(apiUrls.deepLinks(), toDeepLinkBody(data));
  return camelCaseObject(body) as DeepLink;
}

export async function updateDeepLink(uuid: string, data: DeepLinkWriteData): Promise<DeepLink> {
  const { data: body } = await getAuthenticatedHttpClient().put(apiUrls.deepLink(uuid), toDeepLinkBody(data));
  return camelCaseObject(body) as DeepLink;
}

export async function deleteDeepLink(uuid: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.deepLink(uuid));
}

export async function getDeepLinksConfig(): Promise<DeepLinksConfig> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.deepLinksConfig());
  return camelCaseObject(data) as DeepLinksConfig;
}

/** Mint a signed test link. The response carries the link itself: never log it. */
export async function mintTestLink(request: TestLinkRequest): Promise<TestLink> {
  const body = {
    target: request.target,
    course_id: request.courseId,
    path_id: request.pathId,
    external_id: request.externalId,
    groups: request.groups,
    ...(request.ttl !== undefined ? { ttl: request.ttl } : {}),
  };
  const { data } = await getAuthenticatedHttpClient().post(apiUrls.testLinks(), body);
  return camelCaseObject(data) as TestLink;
}
