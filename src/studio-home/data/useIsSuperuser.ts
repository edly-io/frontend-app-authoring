/**
 * Determine whether the current user is a superuser.
 *
 * The Open edX JWT does carry an is_superuser claim, but @edx/frontend-platform
 * only maps `administrator` (= is_staff) onto the authenticated-user object —
 * so `getAuthenticatedUser()?.administrator` is Global Staff, not superuser.
 * We fetch /api/user/v1/me from the LMS, which does expose is_superuser.
 */
import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import { useQuery } from '@tanstack/react-query';

interface LmsUserMe {
  is_superuser?: boolean;
}

const fetchIsSuperuser = async (): Promise<boolean> => {
  const { data } = await getAuthenticatedHttpClient().get<LmsUserMe>(
    `${getConfig().LMS_BASE_URL}/api/user/v1/me`,
  );
  return data.is_superuser === true;
};

/**
 * Returns { isSuperuser: boolean }.
 * Falls back to false while loading or on error (no access shown).
 */
export const useIsSuperuser = () => {
  const user = getAuthenticatedUser();
  const { data: isSuperuser = false } = useQuery({
    queryKey: ['studio-home', 'isSuperuser', user?.userId],
    queryFn: fetchIsSuperuser,
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });
  return isSuperuser;
};
