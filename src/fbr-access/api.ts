import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type { FbrUserProfile } from './types';

export const getCurrentFbrProfileUrl = () => `${getConfig().LMS_BASE_URL}/fbr/api/biodata/v1/users/me/`;

export const getCurrentFbrProfile = async (): Promise<FbrUserProfile> => {
  const { data } = await getAuthenticatedHttpClient().get(getCurrentFbrProfileUrl());
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    roles: Array.isArray(data.roles) ? data.roles : [],
    city: data.city ?? null,
  };
};
