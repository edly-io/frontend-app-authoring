import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { courseOutlineQueryKeys } from '@src/course-outline/data/apiHooks';
import { getCourseKey } from '@src/generic/key-utils';
import {
  approveCourse,
  approveBlock,
  createComment,
  createCourseComment,
  deleteComment,
  getBlockComments,
  getBlockState,
  getBulkCourseAggregateStates,
  getCourseAggregateState,
  getCourseComments,
  publishBlock,
  publishCourse,
  requestChanges,
  requestCourseChanges,
  resolveComment,
  submitCourseForReview,
  submitForReview,
} from './api';

export const lifecycleQueryKeys = {
  blockState: (usageKey: string) => ['lifecycle', 'block', usageKey, 'state'],
  blockComments: (usageKey: string) => ['lifecycle', 'block', usageKey, 'comments'],
  courseState: (courseId: string) => ['lifecycle', 'course', courseId, 'state'],
  courseComments: (courseId: string) => ['lifecycle', 'course', courseId, 'comments'],
  bulkCourseStates: (courseIds: string[]) => ['lifecycle', 'courses', 'bulk', ...courseIds],
};

export const useBulkCourseAggregateStates = (courseIds: string[]) => useQuery({
  queryKey: lifecycleQueryKeys.bulkCourseStates(courseIds),
  queryFn: () => getBulkCourseAggregateStates(courseIds),
  enabled: courseIds.length > 0,
});

export const useCourseAggregateState = (courseId: string, options?: { enabled?: boolean }) => useQuery({
  queryKey: lifecycleQueryKeys.courseState(courseId),
  queryFn: () => getCourseAggregateState(courseId),
  enabled: options?.enabled ?? true,
  retry: (failureCount, error: any) => {
    if (error?.response?.status === 404) { return false; }
    return failureCount < 3;
  },
});

export const useSubmitCourseForReview = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitCourseForReview(courseId),
    onSuccess: () => {
      // Invalidate all lifecycle queries so every block badge re-fetches its state.
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const useApproveCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const useRequestCourseChanges = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestCourseChanges(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const usePublishCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
      queryClient.invalidateQueries({ queryKey: courseOutlineQueryKeys.contentLibrary(courseId) });
    },
  });
};

export const useBlockState = (usageKey: string) => useQuery({
  queryKey: lifecycleQueryKeys.blockState(usageKey),
  queryFn: () => getBlockState(usageKey),
  // Treat 404 as "unmanaged block" — return null instead of throwing
  retry: (failureCount, error: any) => {
    if (error?.response?.status === 404) {
      return false;
    }
    return failureCount < 3;
  },
});

export const useBlockComments = (usageKey: string) => useQuery({
  queryKey: lifecycleQueryKeys.blockComments(usageKey),
  queryFn: () => getBlockComments(usageKey),
});

export const useCourseComments = (courseId: string) => useQuery({
  queryKey: lifecycleQueryKeys.courseComments(courseId),
  queryFn: () => getCourseComments(courseId),
});

export const useSubmitForReview = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitForReview(usageKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const useApproveBlock = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveBlock(usageKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const useRequestChanges = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestChanges(usageKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const usePublishBlock = (usageKey: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishBlock(usageKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
      // Refresh all outline blocks for this course so status badges update without a page reload.
      queryClient.invalidateQueries({ queryKey: courseOutlineQueryKeys.contentLibrary(getCourseKey(usageKey)) });
      // Allows the unit page to re-fetch its Redux state after a lifecycle publish (see UnitInfoSidebar).
      options?.onSuccess?.();
    },
  });
};

export const useCreateComment = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => createComment(usageKey, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.blockComments(usageKey) });
    },
  });
};

export const useCreateCourseComment = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => createCourseComment(courseId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.courseComments(courseId) });
    },
  });
};

export const useResolveComment = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => resolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.blockComments(usageKey) });
    },
  });
};

export const useDeleteComment = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.blockComments(usageKey) });
    },
  });
};
