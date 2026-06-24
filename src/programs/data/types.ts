export type { FbrRole, FbrUserProfile } from '@src/fbr-access/types';

export interface Course {
  id: string;
  displayName: string;
  org: string;
  run: string;
  targetAudience: string;
}

export interface PaginatedCourses {
  results: Course[];
  count: number;
  numPages: number;
}

export interface Program {
  id: string;
  displayName: string;
  org: string;
  programType: string;
  run: string;
  targetAudience: string;
  city?: string;
  shortDescription?: string;
  longDescription?: string;
  status?: string;
  isFeatured?: boolean;
  startDate?: string;
  endDate?: string;
  image?: string;
  courses?: Course[];
}

export interface OrgOption {
  id: number;
  name: string;
  shortName: string;
}

export interface CityOption {
  id: number;
  name: string;
}

export interface ProgramTypeOption {
  id: number;
  name: string;
  slug: string;
}

export interface ProgramConfig {
  orgs: OrgOption[];
  programTypes: ProgramTypeOption[];
  statuses: string[];
  cities: CityOption[];
}

export interface CityOption {
  id: number;
  name: string;
}

export interface CreateProgramInput {
  displayName: string;
  org: string;
  programType: string;
  run: string;
  cityId?: number;
}

export interface ProgramCapabilities {
  canAccessPrograms: boolean;
  canCreateProgram: boolean;
  canEditProgram: boolean;
  canArchiveProgram: boolean;
  canManageCourses: boolean;
  canManageEnrollment: boolean;
  canManageInstructors: boolean;
  isReadOnly: boolean;
}

export interface ProgramDetailResponse {
  program: Program;
  /** All target audiences available system-wide — used for the dropdown options. */
  availableAudiences: string[];
  /** All cities available — returned by the detail endpoint alongside the program. */
  availableCities: CityOption[];
}

export interface Instructor {
  id: string; // = username, kept for React key prop
  username: string;
  email: string;
  name: string;
  role?: string;
}

export interface PaginatedInstructors {
  results: Instructor[];
  count: number;
  numPages: number;
}

export interface Learner {
  id: string; // = username
  username: string;
  email: string;
  name: string;
}

export interface PaginatedLearners {
  results: Learner[];
  count: number;
  numPages: number;
}

export interface Batch {
  id: string;
  name: string;
}
