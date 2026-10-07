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
      {error && <Form.Control.Feedback type="invalid" hasIcon={false}>{error}</Form.Control.Feedback>}
      {/* Always mounted, so screen readers pick up changes to its text. */}
      <div role="status" className="sr-only">{announcement}</div>
      {showResults && isError && !isFetching && (
        <p className="px-3 py-2 mt-1 mb-0 small text-danger border rounded bg-white" aria-hidden="true">
          {intl.formatMessage(messages.courseSearchError)}
        </p>
      )}
      {showResults && !isError && (
        <ul
          className="list-unstyled border rounded bg-white mt-1 mb-0"
          aria-label={intl.formatMessage(messages.courseSearchResults)}
        >
          {visible.length === 0 && !isFetching && (
            <li className="px-3 py-2 small text-gray-700">{intl.formatMessage(messages.courseSearchNoResults)}</li>
          )}
          {visible.map((course) => {
            const isAdded = addedCourseIds.includes(course.courseId);
            return (
              <li
                key={course.courseId}
                className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
              >
                <span className="mr-3 text-break">
                  <span className="font-weight-bold mr-2">{course.displayName}</span>
                  <span className="x-small text-gray-500">{course.courseId}</span>
                </span>
                <Button
                  size="sm"
                  variant="tertiary"
                  disabled={isAdded}
                  aria-label={intl.formatMessage(isAdded ? messages.courseAddedAria : messages.addCourseAria, {
                    course: course.displayName,
                  })}
                  onClick={() => handlePick(course)}
                >
                  {intl.formatMessage(isAdded ? messages.courseAdded : messages.addCourse)}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Form.Group>
  );
};

export default CoursePicker;
