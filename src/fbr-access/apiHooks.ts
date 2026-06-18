import { useQuery } from '@tanstack/react-query';

import { getCurrentFbrProfile } from './api';

export const currentFbrProfileQueryKey = ['currentFbrProfile'];

export const useCurrentFbrProfile = () => useQuery({
  queryKey: currentFbrProfileQueryKey,
  queryFn: getCurrentFbrProfile,
  staleTime: 5 * 60 * 1000,
  retry: false,
});
