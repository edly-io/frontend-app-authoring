import type { ReactNode } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge } from '@openedx/paragon';

import type { CourseRef } from './types';
import messages from './messages';

/** A description that only repeats the title adds nothing, so it isn't shown. */
const isUseful = (description?: string, title?: string) =>
  !!description?.trim() && description.trim().toLowerCase() !== (title ?? '').trim().toLowerCase();

/**
 * Expanded body of a curriculum or badge card: optional muted description, then the label/value
 * rows. Labels sit in their own column on wide screens and stack above the value on narrow ones.
 */
export const CardDetails = (
  { description, title, children }: { description?: string; title?: string; children: ReactNode; },
) => (
  <div className="configuration-card-content curriculum-management-card-body">
    {isUseful(description, title) && <p className="small text-gray-700 mb-3">{description}</p>}
    <dl className="curriculum-management-details mb-0">{children}</dl>
  </div>
);

export const DetailRow = ({ label, children }: { label: string; children: ReactNode; }) => (
  <div className="curriculum-management-details-row">
    <dt className="x-small text-uppercase text-gray-700 font-weight-bold">{label}</dt>
    <dd className="small mb-0 curriculum-management-min-width-0">{children}</dd>
  </div>
);

/** Muted placeholder for an empty value ("None", "No courses yet"). */
export const EmptyValue = ({ children }: { children: ReactNode; }) => <span className="text-gray-700">{children}</span>;

/** A course as name (or key when unnamed) with its key below, flagged when missing from Studio. */
export const CourseLine = ({ course }: { course: CourseRef; }) => {
  const intl = useIntl();
  return (
    <span className="d-block text-break">
      <span className="font-weight-bold">{course.displayName ?? course.courseId}</span>
      {!course.exists && <Badge variant="danger" className="ml-2">{intl.formatMessage(messages.courseNotFound)}</Badge>}
      <span className="d-block x-small text-gray-700">{course.courseId}</span>
    </span>
  );
};
