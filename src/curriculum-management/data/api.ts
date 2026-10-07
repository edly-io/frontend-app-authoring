import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { PAGE_SIZE } from '../constants';
import type {
  Badge,
  BadgeWriteData,
  CourseSearchResult,
  Curriculum,
  CurriculumWriteData,
  ManagementStatus,
  Paginated,
} from '../types';

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;

const makeUrl = (path: string, searchParams?: Record<string, string | number>): string => {
  const url = new URL(`api/uber/curriculum/v1/curriculum-management/${path}`, getApiBaseUrl());
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.append(key, String(value)));
  }
  return url.href;
};

export const apiUrls = {
  status: () => makeUrl('status/'),
  courses: (search: string, pageNumber = 1) => makeUrl('courses/', { search, page: pageNumber }),
  curriculums: () => makeUrl('curriculums/'),
  curriculumsPage: (pageNumber: number) => makeUrl('curriculums/', { page: pageNumber }),
  curriculum: (uuid: string) => makeUrl(`curriculums/${uuid}/`),
  badges: () => makeUrl('badges/'),
  badgesPage: (pageNumber: number) => makeUrl('badges/', { page: pageNumber }),
  badge: (uuid: string) => makeUrl(`badges/${uuid}/`),
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

const toCurriculumPayload = (data: CurriculumWriteData) => ({
  title: data.title,
  description: data.description,
  course_ids: data.courseIds,
  knowledge_check_course_id: data.knowledgeCheckCourseId,
  knowledge_check_delay_days: data.knowledgeCheckDelayDays,
  badges: data.badges,
});

export async function createCurriculum(data: CurriculumWriteData): Promise<Curriculum> {
  const { data: body } = await getAuthenticatedHttpClient().post(apiUrls.curriculums(), toCurriculumPayload(data));
  return camelCaseObject(body) as Curriculum;
}

export async function updateCurriculum(uuid: string, data: CurriculumWriteData): Promise<Curriculum> {
  const { data: body } = await getAuthenticatedHttpClient().put(apiUrls.curriculum(uuid), toCurriculumPayload(data));
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
