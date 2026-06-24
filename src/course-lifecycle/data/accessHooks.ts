import { useCurrentFbrProfile } from '@src/fbr-access/apiHooks';

import { getLifecycleCapabilities } from './permissions';

export const useLifecycleAccess = () => {
  const query = useCurrentFbrProfile();

  return {
    ...query,
    profile: query.data,
    capabilities: getLifecycleCapabilities(query.data?.roles),
  };
};
