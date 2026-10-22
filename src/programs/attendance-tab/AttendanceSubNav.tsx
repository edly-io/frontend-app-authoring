import React from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

const SUB_TABS = [
  { slug: 'dashboard', label: messages.subNavDashboard },
  { slug: 'by-course', label: messages.subNavByCourse },
  { slug: 'by-learner', label: messages.subNavByLearner },
];

const PILL_CLASSES = 'px-3 py-1 mr-1 mb-1 rounded-pill text-decoration-none';

/** Pill links to the attendance sub-tabs; a session roster counts as By Course. */
const AttendanceSubNav = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const isRoster = Boolean(useMatch('/programs/:programId/attendance/sessions/*'));
  return (
    <nav aria-label={intl.formatMessage(messages.subNavLabel)} className="d-flex flex-wrap mb-3">
      {SUB_TABS.map(({ slug, label }) => (
        <NavLink
          key={slug}
          to={`/programs/${programId}/attendance/${slug}`}
          className={({ isActive }) => {
            const isCurrent = isActive || (slug === 'by-course' && isRoster);
            return `${PILL_CLASSES} ${isCurrent ? 'bg-primary text-white' : 'text-muted'}`;
          }}
        >
          {intl.formatMessage(label)}
        </NavLink>
      ))}
    </nav>
  );
};

export default AttendanceSubNav;
