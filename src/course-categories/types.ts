/** What the current user may do with course categories (`status/`). */
export interface CourseCategoriesStatus {
  /** The `uber_course_categories.enabled` flag is on for the user. */
  enabled: boolean;
  /** The user may change this course's categories (Studio write access). */
  canAssign: boolean;
  /** The user may create, rename and delete categories (global staff). */
  canManage: boolean;
}

/** A category as a course lists it. The slug is its stable identifier; it never changes, even on rename. */
export interface CategorySummary {
  name: string;
  slug: string;
}

/** A category in the categories list, with the number of courses it is assigned to. */
export interface Category extends CategorySummary {
  courseCount: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
