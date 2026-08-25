import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCourseToCat,
  createCategory,
  getCategoriesForCourse,
  getCategoryDetail,
  getCategories,
  linkCategoryToCourse,
  removeCourseFromCat,
  unlinkCategoryFromCourse,
  updateCategory,
} from './api';
import type { Category } from './types';

export const useCategories = () => useQuery({
  queryKey: ['categories'],
  queryFn: getCategories,
});

export const useCategoryDetail = (categoryId: string) => useQuery({
  queryKey: ['category', categoryId],
  queryFn: () => getCategoryDetail(categoryId),
  enabled: !!categoryId,
});

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: { categoryId: string; data: Partial<Pick<Category, 'name' | 'arabicName' | 'slug' | 'isActive'>> }) => (
      updateCategory(categoryId, data)
    ),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
    },
  });
};

export const useAddCourseToCat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, courseId }: { categoryId: string; courseId: string }) => (
      addCourseToCat(categoryId, courseId)
    ),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
    },
  });
};

export const useRemoveCourseFromCat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, courseId }: { categoryId: string; courseId: string }) => (
      removeCourseFromCat(categoryId, courseId)
    ),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
    },
  });
};

// ── Reverse (course -> categories) lookup ─────────────────────────────────────

export const useCourseCategories = (courseId: string) => useQuery({
  queryKey: ['courseCategories', courseId],
  queryFn: () => getCategoriesForCourse(courseId),
  enabled: !!courseId,
});

export const useLinkCategoryToCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, categoryId }: { courseId: string; categoryId: number }) => (
      linkCategoryToCourse(courseId, categoryId)
    ),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories', courseId] });
    },
  });
};

export const useUnlinkCategoryFromCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, categoryId }: { courseId: string; categoryId: number }) => (
      unlinkCategoryFromCourse(courseId, categoryId)
    ),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories', courseId] });
    },
  });
};
