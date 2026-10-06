import { useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Icon, IconButtonWithTooltip } from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';

import type { CourseItem } from '../curriculums/CourseOrderList';
import messages from '../messages';

interface BadgeCourseListProps {
  courses: CourseItem[];
  onChange: (courses: CourseItem[]) => void;
  /** Server errors keyed by course key (mapped from `course_ids` list indexes). */
  rowErrors?: Record<string, string>;
  /** Element to focus after the last row is removed (the course search). */
  emptyFocusId: string;
}

// DOM ids use the row index, never the course key (keys contain ':' and '+').
const removeButtonId = (index: number) => `badge-course-remove-${index}`;

/** A course badge's courses (spec R12): removable rows. Order carries no meaning, so there is no reordering. */
const BadgeCourseList = ({
  courses,
  onChange,
  rowErrors = {},
  emptyFocusId,
}: BadgeCourseListProps) => {
  const intl = useIntl();
  const removedIndex = useRef<number | null>(null);

  // The focused remove button disappears with its row; move focus to the row that took its place, or the search.
  useEffect(() => {
    const index = removedIndex.current;
    if (index === null) {
      return;
    }
    removedIndex.current = null;
    const target = courses.length ? removeButtonId(Math.min(index, courses.length - 1)) : emptyFocusId;
    document.getElementById(target)?.focus();
  }, [courses]);

  if (courses.length === 0) {
    return <p className="x-small text-gray-500 font-italic">{intl.formatMessage(messages.badgeCoursesEmpty)}</p>;
  }
  return (
    <ul className="list-unstyled mb-0" aria-label={intl.formatMessage(messages.badgeCoursesHeading)}>
      {courses.map((course, index) => {
        const name = course.displayName ?? course.id;
        return (
          <li key={course.id} className="d-flex align-items-center border rounded bg-white px-3 py-2 mb-2">
            <span className="mr-auto text-break curriculum-management-min-width-0">
              <span className="d-block font-weight-bold">{name}</span>
              <span className="x-small text-gray-500">{course.id}</span>
              {rowErrors[course.id] && (
                <span className="d-block x-small text-danger" role="alert">{rowErrors[course.id]}</span>
              )}
            </span>
            {!course.exists && (
              <Badge variant="danger" className="ml-2">{intl.formatMessage(messages.courseNotFound)}</Badge>
            )}
            <IconButtonWithTooltip
              id={removeButtonId(index)}
              src={Close}
              iconAs={Icon}
              alt={intl.formatMessage(messages.removeCourse, { course: name })}
              tooltipContent={intl.formatMessage(messages.removeCourse, { course: name })}
              onClick={() => {
                removedIndex.current = index;
                onChange(courses.filter((_, i) => i !== index));
              }}
            />
          </li>
        );
      })}
    </ul>
  );
};

export default BadgeCourseList;
