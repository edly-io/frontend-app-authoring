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
  /** 'is_free', 'is_paid' or 'is_part_of_subscription'. */
  pricingCategory?: string;
  /** Decimal strings, not numbers — avoids float rounding on money. */
  regularPrice?: string | null;
  salePrice?: string | null;
  /** Read-only, computed by the backend with 2 decimals (e.g. "25.13"), or null. */
  discountPercentage?: string | null;
  /** ISO 4217 code of the regular and sale prices. */
  currency?: string;
  /** False when the program is paid and the user is not a superadmin: only they enroll learners into it. */
  canEnrollLearners?: boolean;
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
