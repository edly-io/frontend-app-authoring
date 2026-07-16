import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getProgramScheme,
  publishProgramScheme,
  renameProgramScheme,
  saveProgramScheme,
  unpublishProgramScheme,
} from './api';
import type { SaveSchemeInput, Scheme } from './types';

export const schemeQueryKeys = {
  all: ['programResults', 'scheme'] as const,
  scheme: (programKey: string) => ['programResults', 'scheme', programKey] as const,
};

/** Suppress retries on expected 4xx responses (403 forbidden, 404 not-yet-built). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const retryExceptClientErrors = (failureCount: number, error: any) => {
  if ([403, 404].includes(error?.response?.status)) {
    return false;
  }
  return failureCount < 3;
};

/**
 * Reads the program's scheme. A 404 means no scheme has been built yet
 * (nothing is created on read) — treat it as "blank, unsaved" rather than
 * a hard error; the query's own `error` still carries the status so callers
 * can distinguish it from a real failure or from 403 (permission denied).
 */
export const useProgramScheme = (programKey: string, options?: { enabled?: boolean }) => useQuery({
  queryKey: schemeQueryKeys.scheme(programKey),
  queryFn: () => getProgramScheme(programKey),
  enabled: (options?.enabled ?? true) && !!programKey,
  retry: retryExceptClientErrors,
});

export const useSaveProgramScheme = (programKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveSchemeInput) => saveProgramScheme(programKey, input),
    onSuccess: (scheme: Scheme) => {
      queryClient.setQueryData(schemeQueryKeys.scheme(programKey), scheme);
    },
  });
};

export const useRenameProgramScheme = (programKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => renameProgramScheme(programKey, name),
    onSuccess: (scheme: Scheme) => {
      queryClient.setQueryData(schemeQueryKeys.scheme(programKey), scheme);
    },
  });
};

export const usePublishProgramScheme = (programKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishProgramScheme(programKey),
    onSuccess: (scheme: Scheme) => {
      queryClient.setQueryData(schemeQueryKeys.scheme(programKey), scheme);
    },
  });
};

export const useUnpublishProgramScheme = (programKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unpublishProgramScheme(programKey),
    onSuccess: (scheme: Scheme) => {
      queryClient.setQueryData(schemeQueryKeys.scheme(programKey), scheme);
    },
  });
};
