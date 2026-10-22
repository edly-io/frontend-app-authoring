import React from 'react';
import { NavLink } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge } from '@openedx/paragon';
import { useRequestCounts } from './data/apiHooks';
import type { RequestCounts } from './data/types';
import messages from './messages';

const SUB_TABS: { slug: string; label: typeof messages.subNavLeaves; countKey: keyof RequestCounts }[] = [
  { slug: 'leaves', label: messages.subNavLeaves, countKey: 'leaves' },
  { slug: 'remote-sessions', label: messages.subNavRemoteSessions, countKey: 'remote_sessions' },
  { slug: 'substitute-requests', label: messages.subNavSubstitutes, countKey: 'substitute_requests' },
];

const PILL_CLASSES = 'px-3 py-1 mr-1 mb-1 rounded-pill small text-decoration-none d-inline-flex align-items-center';

/**
 * Pill links to the three request sub-tabs. The badges say which tab holds work, so an admin
 * arriving from the dashboard does not have to open all three. A failed count is silent:
 * a badge is decoration on a working page.
 */
const RequestsSubNav = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const { data: counts } = useRequestCounts(programId);
  return (
    <nav aria-label={intl.formatMessage(messages.subNavLabel)} className="d-flex flex-wrap mb-3">
      {SUB_TABS.map(({ slug, label, countKey }) => {
        const count = counts?.[countKey] ?? 0;
        return (
          <NavLink
            key={slug}
            to={`/programs/${programId}/requests/${slug}`}
            className={({ isActive }) => `${PILL_CLASSES} ${isActive ? 'bg-primary text-white' : 'text-muted'}`}
          >
            {intl.formatMessage(label)}
            {/* Zero is not rendered: a row of "0" badges trains the eye to skip all of them. */}
            {count > 0 && (
              <Badge variant="warning" className="ml-2" aria-label={intl.formatMessage(messages.awaitingAction, { count })}>
                {count}
              </Badge>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default RequestsSubNav;
