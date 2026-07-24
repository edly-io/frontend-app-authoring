import type { FbrRole, ProgramCapabilities } from './types';

const NO_PROGRAM_ACCESS: ProgramCapabilities = {
  canAccessPrograms: false,
  canCreateProgram: false,
  canEditProgram: false,
  canArchiveProgram: false,
  canManageCourses: false,
  canManageEnrollment: false,
  canManageInstructors: false,
  canEditFinalizedResults: false,
  isReadOnly: true,
};

export const getProgramCapabilities = (roles: FbrRole[] = []): ProgramCapabilities => {
  const roleSet = new Set(roles);
  const isSuperAdmin = roleSet.has('super_admin');
  const isMiddleAdmin = roleSet.has('middle_admin');
  const isDataAdmin = roleSet.has('data_admin');
  const isInstructor = roleSet.has('instructor');
  const isProgramAdmin = isSuperAdmin || isMiddleAdmin || isDataAdmin;

  if (!isProgramAdmin && !isInstructor) {
    return NO_PROGRAM_ACCESS;
  }

  return {
    canAccessPrograms: true,
    canCreateProgram: isSuperAdmin || isMiddleAdmin,
    canEditProgram: isProgramAdmin,
    canArchiveProgram: isSuperAdmin || isMiddleAdmin,
    canManageCourses: isProgramAdmin,
    canManageEnrollment: isProgramAdmin,
    canManageInstructors: isProgramAdmin,
    canEditFinalizedResults: isSuperAdmin,
    isReadOnly: !isProgramAdmin,
  };
};
