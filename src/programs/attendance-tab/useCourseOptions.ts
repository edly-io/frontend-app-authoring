import { useMemo } from 'react';
import { useProgramCourses } from '@edly-io/frontend-component-fbr';

export interface CourseOption {
  value: string;
  label: string;
}

interface ApiCourse {
  course_key: string;
  display_name?: string;
}

/** The program's courses as SearchableSelect options, optionally led by a "no course" option. */
export const useCourseOptions = (programKey: string, noCourseOption?: CourseOption) => {
  const coursesQuery = useProgramCourses(programKey);
  const options = useMemo(() => {
    const courses = ((coursesQuery.data ?? []) as unknown as ApiCourse[]).map((course) => ({
      value: course.course_key,
      label: course.display_name || `Course ${course.course_key}`,
    }));
    return noCourseOption ? [noCourseOption, ...courses] : courses;
  }, [coursesQuery.data, noCourseOption]);
  return { options, coursesQuery };
};
