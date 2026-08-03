import type { Course } from '../../programs/data/types';

export interface InstructorOrganization {
  id: number;
  name: string;
  shortName: string;
  arabicName?: string;
  logo?: string | null;
}

// Named InstructorProfile (not "Instructor") to avoid colliding with the
// unrelated Instructor/PaginatedInstructors types in programs/data/types.ts,
// which back the read-only course-team viewer and are a different concept.
export interface InstructorProfile {
  id: number;
  name: string;
  image?: string | null;
  detail?: string;
  featured?: boolean;
  featuredVideo?: string;
  courses?: Course[];
  organizations?: InstructorOrganization[];
}

export interface PaginatedInstructorProfiles {
  results: InstructorProfile[];
  count: number;
  numPages: number;
}

export interface InstructorDetailResponse {
  instructor: InstructorProfile;
}

// Lightweight shape returned by the course -> instructors lookup (Schedule &
// Details page) — just enough to display a row and link to the full edit page.
export interface InstructorSummary {
  id: number;
  name: string;
  image?: string | null;
}
