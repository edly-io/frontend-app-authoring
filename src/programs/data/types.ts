export interface Course {
  id: string;
  displayName: string;
  org: string;
  run: string;
}

export interface PaginatedCourses {
  results: Course[];
  count: number;
  numPages: number;
}

export interface PaginatedPrograms {
  results: Program[];
  count: number;
  numPages: number;
}

export interface Program {
  id: string;
  displayName: string;
  org: string;
  programType: string;
  run: string;
  shortDescription?: string;
  longDescription?: string;
  introVideoId?: string;
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

export interface ProgramTypeOption {
  id: number;
  name: string;
  slug: string;
}

export interface ProgramConfig {
  orgs: OrgOption[];
  programTypes: ProgramTypeOption[];
  statuses: string[];
}

export interface ProgramDetailResponse {
  program: Program;
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
