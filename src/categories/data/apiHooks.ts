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
    mutationFn: (payload: CategoryCreatePayload) => createCategory(payload),
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
    }: { categoryId: string; data: Partial<Pick<Category, 'name' | 'arabicName' | 'isActive'>> }) => (
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
    onMutate: async ({ categoryId, courseId }) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update.
      await queryClient.cancelQueries({ queryKey: ['category', categoryId] });

      // Snapshot the current cached data for rollback on error.
      const previous = queryClient.getQueryData(['category', categoryId]);

      // Optimistically add a placeholder course so the "Linked Courses" tab
      // updates instantly without waiting for the server round-trip.
      queryClient.setQueryData(['category', categoryId], (old: any) => {
        if (!old?.category) { return old; }
        const alreadyLinked = old.category.courses?.some((c: any) => c.id === courseId);
        if (alreadyLinked) { return old; }
        return {
          ...old,
          category: {
            ...old.category,
            courses: [
              ...(old.category.courses ?? []),
              {
                id: courseId, displayName: courseId, org: '', run: '',
              },
            ],
          },
        };
      });

      return { previous };
    },
    onError: (_err, { categoryId }, context: any) => {
      // Roll back to the snapshot if the mutation fails.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['category', categoryId], context.previous);
      }
    },
    onSettled: (_, __, { categoryId }) => {
      // Always refetch so the placeholder is replaced with real server data.
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
