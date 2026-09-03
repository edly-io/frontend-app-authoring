// When backend APIs change this is the ONLY file that needs updating.
// All components call only the hooks in apiHooks.ts.

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type { Course } from '../../programs/data/types';
import type {
  Category,
  CategoryCreatePayload,
  CategoryDetailResponse,
  CategorySummary,
} from './types';

const getCategoriesBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/rwaq/api/categories`;

// ── Response → Course type transformation ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCourse = (d: any): Course => ({
  id: d.course_key,
  displayName: d.display_name,
  org: d.org,
  run: d.run,
});

// ── Response → Category type transformation ───────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCategory = (d: any): Category => ({
  id: d.id,
  name: d.name,
  arabicName: d.arabic_name ?? '',
  slug: d.slug,
  isActive: d.is_active ?? true,
  courses: d.courses?.map(toCourse) ?? [],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCategorySummary = (d: any): CategorySummary => ({
  id: d.id,
  name: d.name,
  arabicName: d.arabic_name ?? '',
  slug: d.slug,
  isActive: d.is_active ?? true,
});

// ── List — GET /rwaq/api/categories/ ─────────────────────────────────────────
export const getCategories = async (): Promise<Category[]> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getCategoriesBaseUrl()}/`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toCategory);
};

// ── Detail — GET /rwaq/api/categories/<id>/ ───────────────────────────────────
export const getCategoryDetail = async (categoryId: string): Promise<CategoryDetailResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(`${getCategoriesBaseUrl()}/${categoryId}/`);
  return { category: toCategory(data) };
};

// ── Create — POST /rwaq/api/categories/ ──────────────────────────────────────
export const createCategory = async (input: CategoryCreatePayload): Promise<Category> => {
  const body: Record<string, unknown> = {
    name: input.name,
    arabic_name: input.arabicName ?? '',
    is_active: input.isActive ?? true,
  };
  if (input.slug !== undefined) { body.slug = input.slug; }
  const { data } = await getAuthenticatedHttpClient().post(`${getCategoriesBaseUrl()}/`, body);
  return toCategory(data);
};

// ── Update — PATCH /rwaq/api/categories/<id>/ ─────────────────────────────────
export const updateCategory = async (
  categoryId: string,
  payload: Partial<Pick<Category, 'name' | 'arabicName' | 'slug' | 'isActive'>>,
): Promise<Category> => {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) { body.name = payload.name; }
  if (payload.arabicName !== undefined) { body.arabic_name = payload.arabicName; }
  if (payload.slug !== undefined) { body.slug = payload.slug; }
  if (payload.isActive !== undefined) { body.is_active = payload.isActive; }

  const { data } = await getAuthenticatedHttpClient().patch(
    `${getCategoriesBaseUrl()}/${categoryId}/`,
    body,
  );
  return toCategory(data);
};

// ── Link course to category — POST /rwaq/api/categories/<id>/courses/ ────────
export const addCourseToCat = async (categoryId: string, courseId: string): Promise<Course> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getCategoriesBaseUrl()}/${categoryId}/courses/`,
    { course_id: courseId },
  );
  return toCourse(data);
};

// ── Unlink course — DELETE /rwaq/api/categories/<id>/courses/?course_id=... ──
export const removeCourseFromCat = async (categoryId: string, courseId: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getCategoriesBaseUrl()}/${categoryId}/courses/`,
    { params: { course_id: courseId } },
  );
};

// ── Categories linked to a course — GET /rwaq/api/categories/by-course/<id>/ ─
export const getCategoriesForCourse = async (courseId: string): Promise<CategorySummary[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getCategoriesBaseUrl()}/by-course/${courseId}/`,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toCategorySummary);
};

// ── Link category to course — POST /rwaq/api/categories/by-course/<id>/ ──────
export const linkCategoryToCourse = async (
  courseId: string,
  categoryId: number,
): Promise<CategorySummary> => {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getCategoriesBaseUrl()}/by-course/${courseId}/`,
    { category_id: categoryId },
  );
  return toCategorySummary(data);
};

// ── Unlink category — DELETE /rwaq/api/categories/by-course/<id>/?category_id=... ─
export const unlinkCategoryFromCourse = async (courseId: string, categoryId: number): Promise<void> => {
  await getAuthenticatedHttpClient().delete(
    `${getCategoriesBaseUrl()}/by-course/${courseId}/`,
    { params: { category_id: categoryId } },
  );
};
