import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  finalizeTraineeResult,
  getProgramTrainees,
  getTraineeCourseScores,
  getTraineeResult,
  saveTraineeResult,
} from './api';
import type { SaveTraineeResultInput, TraineeResult } from './types';

export const traineeResultQueryKeys = {
  all: ['programResults', 'traineeResults'] as const,
  trainees: (programKey: string) => ['programResults', 'trainees', programKey] as const,
  courseScores: (programKey: string, traineeId: string) => (
    ['programResults', 'traineeCourseScores', programKey, traineeId] as const
  ),
  result: (programKey: string, traineeId: string) => ['programResults', 'traineeResult', programKey, traineeId] as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const retryExceptClientErrors = (failureCount: number, error: any) => {
  if ([403, 404].includes(error?.response?.status)) {
    return false;
  }
  return failureCount < 3;
};

export const useProgramTrainees = (programKey: string, options?: { enabled?: boolean }) => useQuery({
  queryKey: traineeResultQueryKeys.trainees(programKey),
  queryFn: () => getProgramTrainees(programKey),
  enabled: (options?.enabled ?? true) && !!programKey,
  retry: retryExceptClientErrors,
});

/** Read-only, auto-synced edX course progress for a trainee — independent of any saved result draft. */
export const useTraineeCourseScores = (
  programKey: string,
  traineeId: string,
  options?: { enabled?: boolean },
) => useQuery({
  queryKey: traineeResultQueryKeys.courseScores(programKey, traineeId),
  queryFn: () => getTraineeCourseScores(programKey, traineeId),
  enabled: (options?.enabled ?? true) && !!programKey && !!traineeId,
  retry: retryExceptClientErrors,
});

export const useTraineeResult = (
  programKey: string,
  traineeId: string,
  options?: { enabled?: boolean },
) => useQuery({
  queryKey: traineeResultQueryKeys.result(programKey, traineeId),
  queryFn: () => getTraineeResult(programKey, traineeId),
  enabled: (options?.enabled ?? true) && !!programKey && !!traineeId,
  retry: retryExceptClientErrors,
});

export const useSaveTraineeResult = (programKey: string, traineeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveTraineeResultInput) => saveTraineeResult(programKey, traineeId, input),
    onSuccess: (result: TraineeResult) => {
      queryClient.setQueryData(traineeResultQueryKeys.result(programKey, traineeId), result);
    },
  });
};

export const useFinalizeTraineeResult = (programKey: string, traineeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => finalizeTraineeResult(programKey, traineeId),
    onSuccess: (result: TraineeResult) => {
      queryClient.setQueryData(traineeResultQueryKeys.result(programKey, traineeId), result);
    },
  });
};
