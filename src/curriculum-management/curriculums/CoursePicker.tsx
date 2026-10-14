import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounce } from 'lodash';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Form } from '@openedx/paragon';

import { COURSE_SEARCH_DEBOUNCE_MS } from '../constants';
import { useCourseSearch } from '../data/apiHooks';
import type { CourseSearchResult } from '../types';
import messages from '../messages';

interface CoursePickerProps {
  id: string;
  label: string;
  /** Courses that must not be offered at all (e.g. the knowledge check, or the curriculum's own courses). */
  excludedCourseIds: string[];
  /** Courses already picked: shown, but as a disabled "Added" button. */
  addedCourseIds?: string[];
  /** Course badge pickers: a course that already awards another badge can't be added (one badge per course). */
  blockOtherBadgesCourses?: boolean;
  /** The badge being edited; its own course is not blocked. */
  ownBadgeUuid?: string;
  /** Hint shown under the search input. */
  help?: string;
  /** Validation message, tied to the search input through the Form.Group. */
  error?: string;
  /** Focus the search input when the picker mounts (e.g. after "Change"). */
  autoFocus?: boolean;
  onSelect: (course: CourseSearchResult) => void;
}

const CoursePicker = ({
  id,
  label,
  excludedCourseIds,
  addedCourseIds = [],
  blockOtherBadgesCourses = false,
  ownBadgeUuid,
  help,
  error,
  autoFocus = false,
  onSelect,
}: CoursePickerProps) => {
  const intl = useIntl();
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Created once; don't recreate per keystroke (unlike SearchKeywordsField).
  const debouncedSetTerm = useMemo(() => debounce(setTerm, COURSE_SEARCH_DEBOUNCE_MS), []);
  useEffect(() => () => debouncedSetTerm.cancel(), [debouncedSetTerm]);
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, []);

  const { data: results = [], isFetching, isError } = useCourseSearch(term);
  const visible = results.filter((course) => !excludedCourseIds.includes(course.courseId));
  const showResults = term.trim().length > 0;
  // A failed search must not read as "No matching courses": the author would assume the course doesn't exist.
  const hasSettled = showResults && !isFetching;
  let announcement = '';
  if (hasSettled) {
    announcement = isError
      ? intl.formatMessage(messages.courseSearchError)
      : intl.formatMessage(messages.courseSearchResultCount, { count: visible.length });
  }

  const handlePick = (course: CourseSearchResult) => {
    debouncedSetTerm.cancel();
    setInput('');
    setTerm('');
    onSelect(course);
    // The clicked result disappears with the list; keep focus in the picker so it doesn't fall to <body>.
    inputRef.current?.focus();
  };

  return (
    <Form.Group controlId={id} isInvalid={!!error}>
      <Form.Label>{label}</Form.Label>
      <Form.Control
        ref={inputRef}
        type="search"
        autoComplete="off"
        value={input}
        placeholder={intl.formatMessage(messages.courseSearchPlaceholder)}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setInput(event.target.value);
          debouncedSetTerm(event.target.value);
        }}
      />
      {help && <Form.Text>{help}</Form.Text>}
      {error && <Form.Control.Feedback type="invalid" hasIcon={false}>{error}</Form.Control.Feedback>}
      {/* Always mounted, so screen readers pick up changes to its text. */}
      <div role="status" className="sr-only">{announcement}</div>
      {showResults && isError && !isFetching && (
        <p className="w-100 px-3 py-2 mt-1 mb-0 small text-danger border rounded bg-white" aria-hidden="true">
          {intl.formatMessage(messages.courseSearchError)}
        </p>
      )}
      {showResults && !isError && (
        <ul
          className="curriculum-management-search-results list-unstyled w-100 border rounded bg-white mt-1 mb-0"
          aria-label={intl.formatMessage(messages.courseSearchResults)}
        >
          {visible.length === 0 && !isFetching && (
            <li className="px-3 py-2 small text-gray-700">{intl.formatMessage(messages.courseSearchNoResults)}</li>
          )}
          {visible.map((course) => {
            const isAdded = addedCourseIds.includes(course.courseId);
            const otherBadge = blockOtherBadgesCourses && course.badge && course.badge.uuid !== ownBadgeUuid
              ? course.badge
              : null;
            let buttonLabel = intl.formatMessage(messages.addCourse);
            let ariaLabel = intl.formatMessage(messages.addCourseAria, { course: course.displayName });
            if (isAdded) {
              buttonLabel = intl.formatMessage(messages.courseAdded);
              ariaLabel = intl.formatMessage(messages.courseAddedAria, { course: course.displayName });
            } else if (otherBadge) {
              buttonLabel = intl.formatMessage(messages.courseHasBadge);
              ariaLabel = intl.formatMessage(messages.courseHasBadgeAria, {
                course: course.displayName,
                badge: otherBadge.title,
              });
            }
            return (
              <li
                key={course.courseId}
                className="d-flex align-items-center px-3 py-2 border-bottom"
              >
                {/* One line each, cut with an ellipsis: the action column must keep its width. */}
                <span className="flex-grow-1 mr-3 curriculum-management-min-width-0">
                  <span className="d-block font-weight-bold text-truncate" title={course.displayName}>
                    {course.displayName}
                  </span>
                  <span className="d-block x-small text-gray-700 text-truncate" title={course.courseId}>
                    {course.courseId}
                  </span>
                </span>
                {/* A disabled button gets no hover events, so the badge-title tooltip sits on a wrapper. */}
                <span className="flex-shrink-0" title={otherBadge && !isAdded ? otherBadge.title : undefined}>
                  <Button
                    size="sm"
                    variant="tertiary"
                    disabled={isAdded || !!otherBadge}
                    aria-label={ariaLabel}
                    onClick={() => handlePick(course)}
                  >
                    {buttonLabel}
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Form.Group>
  );
};

export default CoursePicker;
