import { getProgramCapabilities } from './permissions';

describe('getProgramCapabilities', () => {
  it('grants full program management to super_admin, including editing finalized results', () => {
    expect(getProgramCapabilities(['super_admin'])).toEqual({
      canAccessPrograms: true,
      canCreateProgram: true,
      canEditProgram: true,
      canArchiveProgram: true,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      canEditFinalizedResults: true,
      isReadOnly: false,
    });
  });

  it('grants full program management to middle_admin, but not editing finalized results', () => {
    expect(getProgramCapabilities(['middle_admin'])).toEqual({
      canAccessPrograms: true,
      canCreateProgram: true,
      canEditProgram: true,
      canArchiveProgram: true,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      canEditFinalizedResults: false,
      isReadOnly: false,
    });
  });

  it('prevents Data Admins from creating or archiving programs, or editing finalized results', () => {
    expect(getProgramCapabilities(['data_admin'])).toMatchObject({
      canAccessPrograms: true,
      canCreateProgram: false,
      canEditProgram: true,
      canArchiveProgram: false,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      canEditFinalizedResults: false,
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
