import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getAuditLogs } from './auditLogApi';

export const auditLogQueryKeys = {
  all: ['auditLogs'],
  list: (params) => ['auditLogs', 'list', params],
  history: (params) => ['auditLogs', 'history', params],
};

const retryExceptClientErrors = (failureCount, error) => {
  if ([403, 404].includes(error?.response?.status)) {
    return false;
  }
  return failureCount < 3;
};

const auditLogQueryOptions = (params) => ({
  queryFn: () => getAuditLogs(params),
  enabled: !!params.appLabel,
  placeholderData: keepPreviousData,
  retry: retryExceptClientErrors,
});

export const useAuditLogs = (params) => useQuery({
  queryKey: auditLogQueryKeys.list(params),
  ...auditLogQueryOptions(params),
});

export const useRecordHistory = (params) => useQuery({
  queryKey: auditLogQueryKeys.history(params),
  ...auditLogQueryOptions(params),
});
