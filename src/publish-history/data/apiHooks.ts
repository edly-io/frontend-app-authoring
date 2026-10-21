import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { isClientError } from '@src/course-categories/utils';
import { DRAFT, PUBLISHED } from '@src/publish-history/types';
import * as api from './api';

export const publishHistoryQueryKeys = {
  all: ['publishHistory'],
  status: (courseId: string) => [...publishHistoryQueryKeys.all, 'status', courseId],
  versions: (courseId: string) => [...publishHistoryQueryKeys.all, 'versions', courseId],
  diff: (courseId: string, version: string, against: string) => [
    ...publishHistoryQueryKeys.all,
    'diff',
    courseId,
    version,
    against,
  ],
};

/** Retry network/5xx failures up to 3 times, but never 4xx responses. */
const retryUnlessClientError = (failureCount: number, error: unknown) => !isClientError(error) && failureCount < 3;

/**
 * What the current user may do with this course's publish history. Runs on every outline render, so it is fetched
 * once per course and session. Any error (e.g. 404 when the plugin isn't installed) counts as "nothing allowed",
 * which hides the button.
 */
export const usePublishHistoryStatus = (courseId: string) => {
  const { data } = useQuery({
    queryKey: publishHistoryQueryKeys.status(courseId),
    queryFn: () => api.getStatus(courseId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
  return {
    enabled: data?.enabled ?? false,
    canView: data?.canView ?? false,
  };
};

/** The course's published versions, newest first, a page at a time (`fetchNextPage` loads older ones). */
export const useVersions = (courseId: string) =>
  useInfiniteQuery({
    queryKey: publishHistoryQueryKeys.versions(courseId),
    queryFn: ({ pageParam }) => api.getVersions(courseId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextAfter ?? undefined,
    retry: retryUnlessClientError,
  });

/**
 * The comparison of `version` with `against`. A comparison with the draft or the current published version is
 * always refetched, since both move on with every edit or publish; two version ids (or `previous`) never change.
 */
export const useDiff = (courseId: string, version: string, against: string | null) =>
  useQuery({
    queryKey: publishHistoryQueryKeys.diff(courseId, version, against ?? ''),
    queryFn: () => api.getDiff(courseId, version, against as string),
    enabled: against !== null,
    staleTime: against === DRAFT || against === PUBLISHED ? 0 : Infinity,
    retry: retryUnlessClientError,
  });
