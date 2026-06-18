import type { FbrRole } from '@src/fbr-access/types';
import type { BlockReviewState } from './types';

export interface LifecycleCapabilities {
  canAccessLifecycle: boolean;
  canSubmitLifecycle: boolean;
  canReviewLifecycle: boolean;
  canManageComments: boolean;
}

const NO_LIFECYCLE_ACCESS: LifecycleCapabilities = {
  canAccessLifecycle: false,
  canSubmitLifecycle: false,
  canReviewLifecycle: false,
  canManageComments: false,
};

export const getLifecycleCapabilities = (roles: FbrRole[] = []): LifecycleCapabilities => {
  const roleSet = new Set(roles);
  const isReviewer = roleSet.has('super_admin')
    || roleSet.has('middle_admin')
    || roleSet.has('data_admin');
  const isInstructor = roleSet.has('instructor');
  const canAccessLifecycle = isReviewer || isInstructor;

  if (!canAccessLifecycle) {
    return NO_LIFECYCLE_ACCESS;
  }

  return {
    canAccessLifecycle: true,
    canSubmitLifecycle: true,
    canReviewLifecycle: isReviewer,
    canManageComments: true,
  };
};

interface LifecyclePublishQuery {
  data?: BlockReviewState;
  error?: unknown;
  isLoading: boolean;
  isAccessPending: boolean;
  isAccessDenied: boolean;
}

export const getLifecyclePublishPermission = ({
  data,
  error,
  isLoading,
  isAccessPending,
  isAccessDenied,
}: LifecyclePublishQuery): boolean | undefined => {
  if (isAccessPending || isAccessDenied || isLoading) {
    return false;
  }

  if ((error as any)?.response?.status === 404) {
    return undefined;
  }

  if (error) {
    return false;
  }

  return data?.canPublish;
};
