import { getProgramCapabilities } from './permissions';

describe('getProgramCapabilities', () => {
  it.each(['super_admin', 'middle_admin'] as const)(
    'grants full program management to %s',
    (role) => {
      expect(getProgramCapabilities([role])).toEqual({
        canAccessPrograms: true,
        canCreateProgram: true,
        canEditProgram: true,
        canArchiveProgram: true,
        canManageCourses: true,
        canManageEnrollment: true,
        canManageInstructors: true,
        isReadOnly: false,
      });
    },
  );

  it('prevents Data Admins from creating or archiving programs', () => {
    expect(getProgramCapabilities(['data_admin'])).toMatchObject({
      canAccessPrograms: true,
      canCreateProgram: false,
      canEditProgram: true,
      canArchiveProgram: false,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      isReadOnly: false,
    });
  });

  it('gives instructors read-only access', () => {
    expect(getProgramCapabilities(['instructor'])).toMatchObject({
      canAccessPrograms: true,
      canCreateProgram: false,
      canEditProgram: false,
      canManageCourses: false,
      canManageEnrollment: false,
      canManageInstructors: false,
      isReadOnly: true,
    });
  });

  it('denies program access to trainees', () => {
    expect(getProgramCapabilities(['trainee'])).toMatchObject({
      canAccessPrograms: false,
      canCreateProgram: false,
      canEditProgram: false,
      isReadOnly: true,
    });
  });

  it('denies program access when no FBR role is available', () => {
    expect(getProgramCapabilities([])).toMatchObject({
      canAccessPrograms: false,
      canCreateProgram: false,
      canEditProgram: false,
      isReadOnly: true,
    });
  });
});
