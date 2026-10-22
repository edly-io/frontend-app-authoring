import {
  keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient,
} from '@tanstack/react-query';
import { FBR_QUERY_OPTIONS, fbrKeys } from '@edly-io/frontend-component-fbr';
import {
  assignSubstitute, bulkApproveLeaves, cancelCoveredSession, closeSubstituteRequest, getRequestCounts, getRequests,
  getSubstituteRequest, getSubstituteRequests, reviewRequest, updateLeaveThreshold,
} from './api';
import type {
  RequestListParams, RequestType, ReviewVariables, SubstituteListParams, SubstituteRequest,
} from './types';

// Under the library's 'fbr' root, next to the keys of the data these requests change.
export const requestKeys = {
  requests: ['fbr', 'requests'] as const,
  requestList: (type: RequestType, params: RequestListParams) => ['fbr', 'requests', type, params] as const,
  counts: ['fbr', 'requestCounts'] as const,
  countsFor: (programKey: string) => ['fbr', 'requestCounts', programKey] as const,
  substitutes: ['fbr', 'substituteRequests'] as const,
  substituteList: (params: SubstituteListParams) => ['fbr', 'substituteRequests', 'list', params] as const,
  substitute: (id: string) => ['fbr', 'substituteRequests', 'detail', id] as const,
  leaveUsage: ['fbr', 'leaveUsage'] as const,
  approvedLeaves: ['fbr', 'approvedLeaves'] as const,
};

const invalidateAll = (queryClient: QueryClient, keys: readonly (readonly unknown[])[]) => Promise.all(
  keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
);

// A review changes the lists, the badges, leave usage, the approved-leave overlays and the audit log.
// Approving an instructor's leave also opens substitute requests.
const REQUEST_DATA_KEYS = [
  requestKeys.requests,
  requestKeys.counts,
  requestKeys.substitutes,
  requestKeys.leaveUsage,
  requestKeys.approvedLeaves,
  fbrKeys.sessionApprovedLeavesLists,
  fbrKeys.auditLogs,
];

// Substitute actions edit or cancel the covered session, so the calendar refreshes too.
const SUBSTITUTE_DATA_KEYS = [
  requestKeys.substitutes,
  requestKeys.counts,
  fbrKeys.calendarSessions,
  fbrKeys.sessions,
  fbrKeys.sessionLists,
  fbrKeys.auditLogs,
];

export const useRequests = (type: RequestType, params: RequestListParams) => useQuery({
  queryKey: requestKeys.requestList(type, params),
  queryFn: () => getRequests(type, params),
  ...FBR_QUERY_OPTIONS,
  placeholderData: keepPreviousData,
});

export const useRequestCounts = (programKey: string) => useQuery({
  queryKey: requestKeys.countsFor(programKey),
  queryFn: () => getRequestCounts(programKey),
  ...FBR_QUERY_OPTIONS,
});

export const useSubstituteRequests = (params: SubstituteListParams) => useQuery({
  queryKey: requestKeys.substituteList(params),
  queryFn: () => getSubstituteRequests(params),
  ...FBR_QUERY_OPTIONS,
  placeholderData: keepPreviousData,
});

/** A single request, for an assign deep link whose row is not on the current page. */
export const useSubstituteRequest = (id: string | null, enabled: boolean) => useQuery({
  queryKey: requestKeys.substitute(id ?? ''),
  queryFn: () => getSubstituteRequest(id as string),
  ...FBR_QUERY_OPTIONS,
  enabled: enabled && Boolean(id),
});

export const useReviewRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ request, state, reviewerNote }: ReviewVariables) => reviewRequest(request, state, reviewerNote),
    onSuccess: () => invalidateAll(queryClient, REQUEST_DATA_KEYS),
  });
};

export const useBulkApproveLeaves = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programKey, leaveIds }: { programKey: string; leaveIds: string[] }) => (
      bulkApproveLeaves(programKey, leaveIds)
    ),
    onSuccess: () => invalidateAll(queryClient, REQUEST_DATA_KEYS),
  });
};

export const useAssignSubstitute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignSubstitute,
    onSuccess: () => invalidateAll(queryClient, SUBSTITUTE_DATA_KEYS),
  });
};

export const useCloseSubstituteRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (substituteRequest: SubstituteRequest) => closeSubstituteRequest(substituteRequest.id),
    onSuccess: () => invalidateAll(queryClient, SUBSTITUTE_DATA_KEYS),
  });
};

export const useCancelCoveredSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelCoveredSession,
    onSuccess: () => invalidateAll(queryClient, SUBSTITUTE_DATA_KEYS),
  });
};

/** The leave threshold drives at-risk flags, usage and approval warnings, so all of them refetch. */
export const useUpdateLeaveThreshold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programKey, threshold }: { programKey: string; threshold: number }) => (
      updateLeaveThreshold(programKey, threshold)
    ),
    onSuccess: (_, { programKey }) => invalidateAll(queryClient, [
      fbrKeys.program(programKey),
      ['program', programKey],
      requestKeys.requests,
      requestKeys.leaveUsage,
      fbrKeys.auditLogs,
    ]),
  });
};
