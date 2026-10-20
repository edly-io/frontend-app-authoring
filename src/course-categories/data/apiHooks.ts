import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { CategorySummary } from '../types';
import { isClientError } from '../utils';
import * as api from './api';

export const courseCategoryQueryKeys = {
  all: ['courseCategories'],
  status: (courseId: string) => [...courseCategoryQueryKeys.all, 'status', courseId],
  categories: () => [...courseCategoryQueryKeys.all, 'categories'],
  allCourseCategories: () => [...courseCategoryQueryKeys.all, 'courseCategories'],
  courseCategories: (courseId: string) => [...courseCategoryQueryKeys.allCourseCategories(), courseId],
};

/** Retry network/5xx failures up to 3 times, but never 4xx responses. */
const retryUnlessClientError = (failureCount: number, error: unknown) => !isClientError(error) && failureCount < 3;

/**
 * What the current user may do with this course's categories. Runs on every outline render, so it is fetched
 * once per course and session. Any error (e.g. 404 when the plugin isn't installed) counts as "nothing allowed",
 * which hides the button.
 */
export const useCourseCategoriesStatus = (courseId: string) => {
  const { data } = useQuery({
    queryKey: courseCategoryQueryKeys.status(courseId),
    queryFn: () => api.getStatus(courseId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
  return {
    enabled: data?.enabled ?? false,
    canAssign: data?.canAssign ?? false,
    canManage: data?.canManage ?? false,
  };
};

/** Every category, with course counts. Only mounted while the categories modal is open. */
export const useCategories = () =>
  useQuery({
    queryKey: courseCategoryQueryKeys.categories(),
    queryFn: api.getAllCategories,
    retry: retryUnlessClientError,
  });

/** The course's assigned categories. Only mounted while the categories modal is open. */
export const useCourseCategories = (courseId: string) =>
  useQuery({
    queryKey: courseCategoryQueryKeys.courseCategories(courseId),
    queryFn: () => api.getCourseCategories(courseId),
    retry: retryUnlessClientError,
  });

const byName = (a: CategorySummary, b: CategorySummary) => a.name.localeCompare(b.name);

/** Create and rename change only the categories list (course lists show names, so rename refreshes them too). */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.categories() }),
  });
};

export const useRenameCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, name }: { slug: string; name: string; }) => api.renameCategory(slug, name),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.categories() }),
        queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.allCourseCategories() }),
      ]),
  });
};

/** Deleting a category unassigns it from every course, so every cached course list is refreshed too. */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.deleteCategory(slug),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.categories() }),
        queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.allCourseCategories() }),
      ]),
  });
};

/**
 * Assign and unassign update the course's list in place (no refetch, so the chip appears or goes at once) and
 * refresh the categories list, whose course counts changed.
 */
export const useAssignCategory = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.assignCategory(courseId, slug),
    onSuccess: (category) => {
      queryClient.setQueryData<CategorySummary[]>(
        courseCategoryQueryKeys.courseCategories(courseId),
        (current = []) => (
          current.some(({ slug }) => slug === category.slug) ? current : [...current, category].sort(byName)
        ),
      );
      return queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.categories() });
    },
  });
};

export const useUnassignCategory = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.unassignCategory(courseId, slug),
    onSuccess: (_, removedSlug) => {
      queryClient.setQueryData<CategorySummary[]>(
        courseCategoryQueryKeys.courseCategories(courseId),
        (current = []) => current.filter(({ slug }) => slug !== removedSlug),
      );
      return queryClient.invalidateQueries({ queryKey: courseCategoryQueryKeys.categories() });
    },
  });
};
