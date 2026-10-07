import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import type { BadgeWriteData, CurriculumWriteData } from '../types';
import * as api from './api';

// Query-key factory, in the style of taxonomyQueryKeys (src/taxonomy/data/apiHooks.ts).
export const curriculumQueryKeys = {
  all: ['curriculumManagement'],
  status: () => [...curriculumQueryKeys.all, 'status'],
  curriculums: () => [...curriculumQueryKeys.all, 'curriculums'],
  badges: () => [...curriculumQueryKeys.all, 'badges'],
  courseSearch: (term: string) => [...curriculumQueryKeys.all, 'courseSearch', term],
};

const isClientError = (error: unknown) => {
  const status = (error as AxiosError | undefined)?.response?.status;
  return status !== undefined && status >= 400 && status < 500;
};

/** Retry network/5xx failures up to 3 times, but never 4xx responses. */
const retryUnlessClientError = (failureCount: number, error: unknown) => !isClientError(error) && failureCount < 3;

/**
 * Whether `uber_features.curriculum_management` is on for this user (spec §6.3). Runs on Studio home
 * (to show the tab), so it is fetched once per session. Any error counts as disabled; a 4xx (e.g. 404
 * when the plugin isn't installed) is final, while a network error or 5xx is retried and reported
 * as `isConnectionError`, so the page can tell "unavailable" apart from "doesn't exist".
 */
export const useCurriculumManagementStatus = () => {
  const { data, isPending, isError, error } = useQuery({
    queryKey: curriculumQueryKeys.status(),
    queryFn: api.getStatus,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
  return {
    enabled: data?.enabled ?? false,
    isPending,
    isConnectionError: isError && !isClientError(error),
  };
};

export const useCurriculums = () =>
  useQuery({
    queryKey: curriculumQueryKeys.curriculums(),
    queryFn: api.getAllCurriculums,
    retry: retryUnlessClientError,
  });

export const useBadges = () =>
  useQuery({
    queryKey: curriculumQueryKeys.badges(),
    queryFn: api.getAllBadges,
    retry: retryUnlessClientError,
  });

/** Typeahead: first page only; no request for a blank term. */
export const useCourseSearch = (term: string) => {
  const trimmed = term.trim();
  return useQuery({
    queryKey: curriculumQueryKeys.courseSearch(trimmed),
    queryFn: () => api.searchCourses(trimmed),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
};

/**
 * Curriculums embed badge summaries and badges embed linked_curriculums, so every
 * mutation refreshes both lists. `status` is deliberately left alone.
 * Returns the refetch promise so `mutateAsync` resolves only once the lists are fresh: callers
 * close their form straight after it, and must not flash a stale card or the empty state.
 */
const useInvalidateLists = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: curriculumQueryKeys.curriculums() }),
      queryClient.invalidateQueries({ queryKey: curriculumQueryKeys.badges() }),
    ]);
};

export const useCreateCurriculum = () => {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (data: CurriculumWriteData) => api.createCurriculum(data),
    onSuccess: invalidate,
  });
};

export const useUpdateCurriculum = () => {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: CurriculumWriteData; }) => api.updateCurriculum(uuid, data),
    onSuccess: invalidate,
  });
};

export const useDeleteCurriculum = () => {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (uuid: string) => api.deleteCurriculum(uuid),
    onSuccess: invalidate,
  });
};

export const useCreateBadge = () => {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (data: BadgeWriteData) => api.createBadge(data),
    onSuccess: invalidate,
  });
};

export const useUpdateBadge = () => {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: BadgeWriteData; }) => api.updateBadge(uuid, data),
    onSuccess: invalidate,
  });
};

export const useDeleteBadge = () => {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (uuid: string) => api.deleteBadge(uuid),
    onSuccess: invalidate,
  });
};
