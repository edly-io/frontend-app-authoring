import { getProgramCapabilities } from './permissions';
import type { FbrRole } from './types';

describe('getProgramCapabilities', () => {
  it('grants full program management, including certificates and editing finalized results, to Super Admins', () => {
    expect(getProgramCapabilities(['super_admin'])).toEqual({
      canAccessPrograms: true,
      canCreateProgram: true,
      canEditProgram: true,
      canArchiveProgram: true,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      canEditFinalizedResults: true,
      canManageCertificates: true,
      canManageProgramOperations: true,
      isReadOnly: false,
    });
  });

  it('grants Middle Admins full program management but not certificates or editing finalized results', () => {
    expect(getProgramCapabilities(['middle_admin'])).toEqual({
      canAccessPrograms: true,
      canCreateProgram: true,
      canEditProgram: true,
      canArchiveProgram: true,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      canEditFinalizedResults: false,
      canManageCertificates: false,
      canManageProgramOperations: true,
      isReadOnly: false,
    });
  });

  it('grants Data Admins the same program management as Middle Admins', () => {
    expect(getProgramCapabilities(['data_admin'])).toEqual({
      canAccessPrograms: true,
      canCreateProgram: true,
      canEditProgram: true,
      canArchiveProgram: true,
      canManageCourses: true,
      canManageEnrollment: true,
      canManageInstructors: true,
      canEditFinalizedResults: false,
      canManageCertificates: false,
      canManageProgramOperations: true,
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
      canManageCertificates: false,
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

  it.each([
    [['super_admin'], true],
    [['middle_admin'], true],
    [['data_admin'], true],
    [['instructor'], false],
    [['trainee'], false],
    [[], false],
  ])('lets %p manage program operations: %p', (roles, expected) => {
    expect(getProgramCapabilities(roles as FbrRole[]).canManageProgramOperations).toBe(expected);
  });
});
