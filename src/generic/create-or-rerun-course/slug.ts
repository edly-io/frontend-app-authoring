/**
 * Mirrors `_slugify_course_key` in rwaq_features/slugs.py: the slug the backend assigns
 * to a course when none is entered.
 */
export const computeDefaultSlug = (org: string, number: string, run: string): string => (
  `course-v1:${org}+${number}+${run}`.replace(/[:+ ]/g, '-').toLowerCase()
);

export default computeDefaultSlug;
