import {
  keepPreviousData, useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query';

import {
  finalizeScores, getCourseScores, getScoringGrid, saveScores,
} from './api';
import type {
  FinalizeScoresInput, ScoringGridParams, SaveScoresInput,
} from './types';

export const scoringGridQueryKeys = {
  all: (programKey: string) => ['programResults', 'scoringGrid', programKey] as const,
  grid: (programKey: string, params: ScoringGridParams) => (
    [...scoringGridQueryKeys.all(programKey), params] as const
  ),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const retryExceptClientErrors = (failureCount: number, error: any) => {
  if ([401, 403, 404, 409].includes(error?.response?.status)) {
    return false;
  }
  return failureCount < 3;
};

/**
 * Server-paginated/filtered read of `GET /trainees/scores/` —
 * `keepPreviousData` avoids a flash to empty while a new page/filter loads.
 * `scheme` isn't sent to the API (the grid response carries its own maxes);
 * callers gate `enabled` on it being loaded so the grid only ever fetches
 * once a published scheme exists.
 */
export const useScoringGrid = (
  programKey: string,
  params: ScoringGridParams,
  options?: { enabled?: boolean },
) => useQuery({
  queryKey: scoringGridQueryKeys.grid(programKey, params),
  queryFn: () => getScoringGrid(programKey, params),
  enabled: (options?.enabled ?? true) && !!programKey,
  placeholderData: keepPreviousData,
  retry: retryExceptClientErrors,
});

export const useSaveScores = (programKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveScoresInput) => saveScores(programKey, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringGridQueryKeys.all(programKey) });
    },
  });
};

export const useFinalizeScores = (programKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinalizeScoresInput = {}) => finalizeScores(programKey, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringGridQueryKeys.all(programKey) });
    },
  });
};

export const courseScoresQueryKeys = {
  detail: (programKey: string, username: string) => (
    ['programResults', 'courseScores', programKey, username] as const
  ),
};

/**
 * Read of `GET /trainees/{traineeId}/course-scores/` for the row-level "View
 * course score" sheet. `enabled` must reflect the sheet's own open/closed
 * state (not just a truthy username) so the request only ever fires while
 * the sheet is actually visible to the user.
 */
export const useCourseScores = (
  programKey: string,
  username: string | null,
  options?: { enabled?: boolean },
) => useQuery({
  queryKey: courseScoresQueryKeys.detail(programKey, username ?? ''),
  queryFn: () => getCourseScores(programKey, username as string),
  enabled: (options?.enabled ?? true) && !!programKey && !!username,
  retry: retryExceptClientErrors,
});
