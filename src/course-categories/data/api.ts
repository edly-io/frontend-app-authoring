import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type {
  Category,
  CategorySummary,
  CourseCategoriesStatus,
  Paginated,
} from '../types';

/** The API's largest page; categories are fetched in full, in pages of this size. */
export const CATEGORIES_PAGE_SIZE = 100;

const makeUrl = (path: string, searchParams?: Record<string, string | number>): string => {
  const url = new URL(`api/uber/course_categories/v1/${path}`, getConfig().STUDIO_BASE_URL);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.append(key, String(value)));
  }
  return url.href;
};

export const apiUrls = {
  status: (courseId: string) => makeUrl('status/', { course_id: courseId }),
  categories: () => makeUrl('categories/'),
  categoriesPage: (pageNumber: number) => makeUrl('categories/', { page: pageNumber, page_size: CATEGORIES_PAGE_SIZE }),
  category: (slug: string) => makeUrl(`categories/${encodeURIComponent(slug)}/`),
  courseCategories: (courseId: string) => makeUrl(`courses/${encodeURIComponent(courseId)}/categories/`),
  courseCategory: (courseId: string, slug: string) => (
    makeUrl(`courses/${encodeURIComponent(courseId)}/categories/${encodeURIComponent(slug)}/`)
  ),
};

export async function getStatus(courseId: string): Promise<CourseCategoriesStatus> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.status(courseId));
  return { enabled: !!data.enabled, canAssign: !!data.can_assign, canManage: !!data.can_manage };
}

/** Every category, by name: page 1 first (to learn `count`), then the remaining pages in parallel. */
export async function getAllCategories(): Promise<Category[]> {
  const client = getAuthenticatedHttpClient();
  const { data: first } = await client.get<Paginated<unknown>>(apiUrls.categoriesPage(1));
  const pageCount = Math.ceil(first.count / CATEGORIES_PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => (
      client.get<Paginated<unknown>>(apiUrls.categoriesPage(index + 2)).then(({ data }) => data.results)
    )),
  );
  return camelCaseObject([...first.results, ...rest.flat()]) as Category[];
}

export async function getCourseCategories(courseId: string): Promise<CategorySummary[]> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.courseCategories(courseId));
  return camelCaseObject(data) as CategorySummary[];
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await getAuthenticatedHttpClient().post(apiUrls.categories(), { name });
  return camelCaseObject(data) as Category;
}

export async function renameCategory(slug: string, name: string): Promise<Category> {
  const { data } = await getAuthenticatedHttpClient().patch(apiUrls.category(slug), { name });
  return camelCaseObject(data) as Category;
}

export async function deleteCategory(slug: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.category(slug));
}

export async function assignCategory(courseId: string, slug: string): Promise<CategorySummary> {
  const { data } = await getAuthenticatedHttpClient().post(apiUrls.courseCategories(courseId), { category: slug });
  return camelCaseObject(data) as CategorySummary;
}

export async function unassignCategory(courseId: string, slug: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.courseCategory(courseId, slug));
}
