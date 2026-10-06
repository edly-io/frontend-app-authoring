import { useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge,
  Icon,
  IconButtonWithTooltip,
} from '@openedx/paragon';
import { ArrowDownward, ArrowUpward, Close } from '@openedx/paragon/icons';

import DraggableList, { SortableItem } from '../../generic/DraggableList';
import messages from '../messages';

export interface CourseItem {
  /** The course key. Called `id` because DraggableList/SortableItem key items by a string `id`. */
  id: string;
  displayName: string | null;
  exists: boolean;
}

interface CourseOrderListProps {
  courses: CourseItem[];
  onChange: (courses: CourseItem[]) => void;
  /** Server errors keyed by course key (mapped from `course_ids` list indexes). */
  rowErrors?: Record<string, string>;
  /** Element to focus after the last row is removed (e.g. the course search). */
  emptyFocusId?: string;
}

type Direction = 'up' | 'down';

// DOM ids use the row index, never the course key (keys contain ':' and '+').
const moveButtonId = (direction: Direction, index: number) => `curriculum-course-move-${direction}-${index}`;
const removeButtonId = (index: number) => `curriculum-course-remove-${index}`;

type PendingFocus = { kind: 'move'; id: string; direction: Direction; } | { kind: 'remove'; index: number; };

const CourseOrderList = ({
  courses,
  onChange,
  rowErrors = {},
  emptyFocusId,
}: CourseOrderListProps) => {
  const intl = useIntl();
  const pendingFocus = useRef<PendingFocus | null>(null);

  // The focused button's row moves or disappears when `courses` changes, which would drop focus to <body>.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) {
      return;
    }
    pendingFocus.current = null;
    if (pending.kind === 'remove') {
      if (courses.length === 0) {
        if (emptyFocusId) {
          document.getElementById(emptyFocusId)?.focus();
        }
        return;
      }
      // Same position (the next row slid up), or the new last row.
      document.getElementById(removeButtonId(Math.min(pending.index, courses.length - 1)))?.focus();
      return;
    }
    const { id, direction } = pending;
    const index = courses.findIndex((course) => course.id === id);
    const atEdge = direction === 'up' ? index === 0 : index === courses.length - 1;
    const target = atEdge ? (direction === 'up' ? 'down' : 'up') : direction;
    document.getElementById(moveButtonId(target, index))?.focus();
  }, [courses]);

  const move = (index: number, direction: Direction) => {
    const next = [...courses];
    const [item] = next.splice(index, 1);
    next.splice(direction === 'up' ? index - 1 : index + 1, 0, item);
    pendingFocus.current = { kind: 'move', id: item.id, direction };
    onChange(next);
  };

  const remove = (index: number) => {
    pendingFocus.current = { kind: 'remove', index };
    onChange(courses.filter((_, i) => i !== index));
  };

  return (
    <DraggableList
      itemList={courses}
      // DraggableList passes an updater that computes the new array itself; Formik's
      // setFieldValue can't take an updater, so call it here.
      setState={(updater: (prev: CourseItem[]) => CourseItem[]) => onChange(updater(courses))}
      // Must stay inline (new identity per render): DraggableList's handleDragEnd only sees
      // the current itemList when updateOrder changes. Memoizing it would reorder a stale list.
      updateOrder={() => () => {}}
    >
      {courses.map((course, index) => {
        const name = course.displayName ?? course.id;
        return (
          <SortableItem
            key={course.id}
            id={course.id}
            cardClassName="mb-2 px-3 py-2"
            actions={
              <>
                <span className="mr-auto d-flex align-items-center curriculum-management-min-width-0">
                  <Badge variant="light" className="mr-3">{index + 1}</Badge>
                  <span className="text-break">
                    <span className="d-block font-weight-bold" data-testid="course-order-name">{name}</span>
                    <span className="x-small text-gray-500">{course.id}</span>
                    {rowErrors[course.id] && (
                      <span className="d-block x-small text-danger" role="alert">{rowErrors[course.id]}</span>
                    )}
                  </span>
                  {!course.exists && (
                    <Badge variant="danger" className="ml-2">{intl.formatMessage(messages.courseNotFound)}</Badge>
                  )}
                </span>
                <IconButtonWithTooltip
                  id={moveButtonId('up', index)}
                  src={ArrowUpward}
                  iconAs={Icon}
                  alt={intl.formatMessage(messages.moveUp, { course: name })}
                  tooltipContent={intl.formatMessage(messages.moveUp, { course: name })}
                  disabled={index === 0}
                  onClick={() => move(index, 'up')}
                />
                <IconButtonWithTooltip
                  id={moveButtonId('down', index)}
                  src={ArrowDownward}
                  iconAs={Icon}
                  alt={intl.formatMessage(messages.moveDown, { course: name })}
                  tooltipContent={intl.formatMessage(messages.moveDown, { course: name })}
                  disabled={index === courses.length - 1}
                  onClick={() => move(index, 'down')}
                />
                <IconButtonWithTooltip
                  id={removeButtonId(index)}
                  src={Close}
                  iconAs={Icon}
                  alt={intl.formatMessage(messages.removeCourse, { course: name })}
                  tooltipContent={intl.formatMessage(messages.removeCourse, { course: name })}
                  onClick={() => remove(index)}
                />
              </>
            }
          />
        );
      })}
    </DraggableList>
  );
};

export default CourseOrderList;
