import type { IntlShape } from 'react-intl';

import { getErrorStatus } from '@src/course-categories/utils';
import type { HistoryUser, PublishVersion } from './types';
import messages from './messages';

/** The first eight characters of a version id: enough to tell versions apart on screen. */
export const shortId = (id: string) => id.slice(0, 8);

export const formatTime = (intl: IntlShape, value: string | null) => (
  value
    ? intl.formatDate(value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    : intl.formatMessage(messages.noDate)
);

export const userName = (intl: IntlShape, user: HistoryUser | null) => (
  user ? user.username : intl.formatMessage(messages.unknownUser)
);

export const versionLabel = (intl: IntlShape, version: PublishVersion) => (
  intl.formatMessage(messages.optionVersion, {
    date: formatTime(intl, version.publishedAt),
    user: userName(intl, version.publishedBy),
  })
);

/** A value as text: strings as they are, anything else as JSON. React escapes it, so it is never markup. */
export const formatValue = (value: unknown, empty: string) => {
  if (value === null || value === undefined || value === '') {
    return empty;
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

/** A key path in a JSON value, for example `zones › 0 › title`. */
export const formatPath = (path: (string | number)[]) => path.join(' › ');

/**
 * The message for a failed list or comparison request, from its status and the API's `code`. A 400 other than "no
 * previous version" gets `invalid` (a malformed parameter), which defaults to `fallback`.
 */
export const getErrorMessage = (
  error: unknown,
  fallback: typeof messages.loadError,
  invalid: typeof messages.loadError = fallback,
) => {
  const status = getErrorStatus(error);
  if (status === 403) {
    return messages.permissionError;
  }
  const data = (error as { response?: { data?: { code?: string; }; }; })?.response?.data;
  if (status === 404 && data?.code === 'version_not_found') {
    return messages.versionNotFound;
  }
  if (status === 410) {
    return messages.versionPruned;
  }
  if (status === 400) {
    return data?.code === 'no_previous_version' ? messages.noPrevious : invalid;
  }
  return fallback;
};
