import { useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

const useFormatters = () => {
  const intl = useIntl();
  const dash = intl.formatMessage(messages.notAvailable);
  const date = (value?: string | null) => (value
    ? intl.formatDate(value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    : dash);
  const number = (value?: number | null) => (value === null || value === undefined ? dash : intl.formatNumber(value));
  const percent = (value?: number | null) => (
    value === null || value === undefined ? dash : `${intl.formatNumber(value, { maximumFractionDigits: 1 })}%`
  );
  // Three states, not two: a course or slot with no badge linked has nothing to earn, so showing
  // it as "Not Awarded" would read as the learner having failed at something that does not exist.
  const badge = (configured: boolean | undefined, awarded: boolean) => {
    // Only an explicit `false` means "nothing to earn". A backend that predates
    // `badge_configured` sends nothing, and treating that as "no badge" would turn every
    // earned badge into a grey "No Badge" — fall back to the two-state read instead.
    if (configured === false) {
      return (
        <span className="reporting-badge reporting-badge--muted">
          {intl.formatMessage(messages.badgeNone)}
        </span>
      );
    }
    return (
      <span className={`reporting-badge reporting-badge--${awarded ? 'positive' : 'negative'}`}>
        {intl.formatMessage(awarded ? messages.badgeYes : messages.badgeNo)}
      </span>
    );
  };
  const gain = (value?: number | null) => {
    if (value === null || value === undefined) { return dash; }
    return (
      <span className={`reporting-gain reporting-gain--${value < 0 ? 'down' : 'up'}`}>
        {intl.formatNumber(value, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
      </span>
    );
  };
  const status = (value: boolean | null | undefined, yes: string, no: string) => {
    if (value === null || value === undefined) { return dash; }
    return (
      <span className={`reporting-badge reporting-badge--${value ? 'positive' : 'negative'}`}>
        {value ? yes : no}
      </span>
    );
  };
  // Memoised on `intl` alone: every formatter closes over nothing else that changes, and a fresh object
  // each render would defeat the `useMemo`s downstream that list `f` among their dependencies.
  return useMemo(() => ({
    intl,
    dash,
    badge,
    date,
    gain,
    number,
    percent,
    status,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [intl]);
};

export default useFormatters;
