import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

export interface CourseCategory {
  id: number;
  name: string;
  arabic_name: string | null;
  is_active: boolean;
}

const categoriesUrl = (courseId: string) => (
  `${getConfig().STUDIO_BASE_URL}/rwaq/api/categories/by-course/${encodeURIComponent(courseId)}/`
);

export const getCourseCategories = async (courseId: string): Promise<CourseCategory[]> => {
  const { data } = await getAuthenticatedHttpClient().get(categoriesUrl(courseId));
  return data;
};

export const getAllCourseCategories = async (courseId: string): Promise<CourseCategory[]> => {
  const { data } = await getAuthenticatedHttpClient().get(categoriesUrl(courseId), { params: { scope: 'all' } });
  return data;
};

export const addCourseCategory = async (courseId: string, categoryId: number): Promise<void> => {
  await getAuthenticatedHttpClient().post(categoriesUrl(courseId), { category_id: categoryId });
};

export const removeCourseCategory = async (courseId: string, categoryId: number): Promise<void> => {
  await getAuthenticatedHttpClient().delete(categoriesUrl(courseId), { params: { category_id: categoryId } });
};
