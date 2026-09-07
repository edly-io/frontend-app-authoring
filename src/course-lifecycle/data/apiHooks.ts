import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { courseOutlineQueryKeys } from '@src/course-outline/data/apiHooks';
import { getCourseKey } from '@src/generic/key-utils';
import {
  addReply,
  approveCourse,
  approveBlock,
  deleteComment,
  getBlockComments,
  getBlockState,
  getBulkCourseAggregateStates,
  getCourseAggregateState,
  getCourseAttribution,
  getCourseComments,
  requestChanges,
  requestCourseChanges,
  resolveComment,
  submitCourseForReview,
  submitForReview,
} from './api';
import { useLifecycleAccess } from './accessHooks';

export const lifecycleQueryKeys = {
  blockState: (usageKey: string) => ['lifecycle', 'block', usageKey, 'state'],
  blockComments: (usageKey: string) => ['lifecycle', 'block', usageKey, 'comments'],
  courseState: (courseId: string) => ['lifecycle', 'course', courseId, 'state'],
  courseComments: (courseId: string) => ['lifecycle', 'course', courseId, 'comments'],
  bulkCourseStates: (courseIds: string[]) => ['lifecycle', 'courses', 'bulk', ...courseIds],
  courseAttribution: (courseIds: string[]) => ['lifecycle', 'courses', 'attribution', ...courseIds],
};

export const useBulkCourseAggregateStates = (courseIds: string[], options?: { enabled?: boolean }) => {
  const { isPending: isAccessPending, capabilities } = useLifecycleAccess();
  const isAccessDenied = !isAccessPending && !capabilities.canAccessLifecycle;
  const query = useQuery({
    queryKey: lifecycleQueryKeys.bulkCourseStates(courseIds),
    queryFn: () => getBulkCourseAggregateStates(courseIds),
    enabled: (options?.enabled ?? true)
      && courseIds.length > 0
      && !isAccessPending
      && capabilities.canAccessLifecycle,
  });

  return { ...query, isAccessPending, isAccessDenied };
};

export const useCourseAttribution = (courseIds: string[], options?: { enabled?: boolean }) => {
  const { isPending: isAccessPending, capabilities } = useLifecycleAccess();
  return useQuery({
    queryKey: lifecycleQueryKeys.courseAttribution(courseIds),
    queryFn: () => getCourseAttribution(courseIds),
    enabled: (options?.enabled ?? true)
      && courseIds.length > 0
      && !isAccessPending
      && capabilities.canAccessLifecycle,
  });
};

export const useCourseAggregateState = (courseId: string, options?: { enabled?: boolean }) => {
  const { isPending: isAccessPending, capabilities } = useLifecycleAccess();
  const isAccessDenied = !isAccessPending && !capabilities.canAccessLifecycle;
  const query = useQuery({
    queryKey: lifecycleQueryKeys.courseState(courseId),
    queryFn: () => getCourseAggregateState(courseId),
    enabled: (options?.enabled ?? true)
      && !!courseId
      && !isAccessPending
      && capabilities.canAccessLifecycle,
    retry: (failureCount, error: any) => {
      if ([403, 404].includes(error?.response?.status)) { return false; }
      return failureCount < 3;
    },
  });

  return { ...query, isAccessPending, isAccessDenied };
};

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
      queryClient.invalidateQueries({ queryKey: courseOutlineQueryKeys.contentLibrary(courseId) });
    },
  });
};

export const useRequestCourseChanges = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comments: string[]) => requestCourseChanges(courseId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const useBlockState = (usageKey: string, options?: { enabled?: boolean }) => {
  const { isPending: isAccessPending, capabilities } = useLifecycleAccess();
  const isAccessDenied = !isAccessPending && !capabilities.canAccessLifecycle;
  const query = useQuery({
    queryKey: lifecycleQueryKeys.blockState(usageKey),
    queryFn: () => getBlockState(usageKey),
    enabled: (options?.enabled ?? true)
      && !!usageKey
      && !isAccessPending
      && capabilities.canAccessLifecycle,
    retry: (failureCount, error: any) => {
      if ([403, 404].includes(error?.response?.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return { ...query, isAccessPending, isAccessDenied };
};

export const useBlockComments = (usageKey: string, options?: { enabled?: boolean }) => {
  const { isPending: isAccessPending, capabilities } = useLifecycleAccess();
  return useQuery({
    queryKey: lifecycleQueryKeys.blockComments(usageKey),
    queryFn: () => getBlockComments(usageKey),
    enabled: (options?.enabled ?? true)
      && !!usageKey
      && !isAccessPending
      && capabilities.canManageComments,
  });
};

export const useCourseComments = (courseId: string, options?: { enabled?: boolean }) => {
  const { isPending: isAccessPending, capabilities } = useLifecycleAccess();
  return useQuery({
    queryKey: lifecycleQueryKeys.courseComments(courseId),
    queryFn: () => getCourseComments(courseId),
    enabled: (options?.enabled ?? true)
      && !!courseId
      && !isAccessPending
      && capabilities.canManageComments,
  });
};

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
      queryClient.invalidateQueries({ queryKey: courseOutlineQueryKeys.contentLibrary(getCourseKey(usageKey)) });
    },
  });
};

export const useRequestChanges = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comments: string[]) => requestChanges(usageKey, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
    },
  });
};

export const useAddReply = (usageKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, comment }: { commentId: number; comment: string }) => (
      addReply(commentId, comment)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.blockComments(usageKey) });
    },
  });
};

export const useAddCourseReply = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, comment }: { commentId: number; comment: string }) => (
      addReply(commentId, comment)
    ),
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
