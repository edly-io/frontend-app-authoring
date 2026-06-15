import {
  getLifecycleCapabilities,
  getLifecyclePublishPermission,
} from './permissions';

describe('course lifecycle permissions', () => {
  it.each([
    ['super_admin', true],
    ['middle_admin', true],
    ['data_admin', true],
    ['instructor', false],
  ] as const)('allows %s to access lifecycle with the expected review access', (role, canReviewLifecycle) => {
    expect(getLifecycleCapabilities([role])).toEqual({
      canAccessLifecycle: true,
      canSubmitLifecycle: true,
      canReviewLifecycle,
      canManageComments: true,
    });
  });

  it.each([
    [['trainee']],
    [[]],
  ] as const)('denies lifecycle access for roles %j', (roles) => {
    expect(getLifecycleCapabilities([...roles])).toEqual({
      canAccessLifecycle: false,
      canSubmitLifecycle: false,
      canReviewLifecycle: false,
      canManageComments: false,
    });
  });

  it('blocks native publishing while lifecycle access or state is loading', () => {
    expect(getLifecyclePublishPermission({
      data: undefined,
      error: null,
      isLoading: false,
      isAccessPending: true,
      isAccessDenied: false,
    })).toBe(false);

    expect(getLifecyclePublishPermission({
      data: undefined,
      error: null,
      isLoading: true,
      isAccessPending: false,
      isAccessDenied: false,
    })).toBe(false);
  });

  it('restores native publishing only when the block is not lifecycle-managed', () => {
    expect(getLifecyclePublishPermission({
      data: undefined,
      error: { response: { status: 404 } },
      isLoading: false,
      isAccessPending: false,
      isAccessDenied: false,
    })).toBeUndefined();
  });
});
