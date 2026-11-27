import type { AxiosError } from 'axios';
import type { IntlShape, MessageDescriptor } from 'react-intl';

import { getErrorStatus, isClientError } from '@src/generic/queryErrors';
import messages from './messages';

// Both mirror uber-features `course_tags/models.py` (NAME_MAX_LENGTH, MAX_TAGS_PER_COURSE); the API enforces them,
// the UI only shows them. Change both together.
/** The longest tag name the API accepts. */
export const TAG_NAME_MAX_LENGTH = 100;
/** The most tags a course may have. */
export const MAX_TAGS_PER_COURSE = 100;

/** The name the API will store for `name`: trimmed, inner whitespace collapsed (uber-features `api.normalize_name`). */
export const normalizeTagName = (name: string) => name.trim().split(/\s+/).filter(Boolean).join(' ');

/** Same name as far as the API's uniqueness goes (ignoring case, after normalising). */
export const isSameTagName = (a: string, b: string) => (
  normalizeTagName(a).toLocaleLowerCase() === normalizeTagName(b).toLocaleLowerCase()
);

/** The API's 400 codes for an assign (uber-features course_tags `api.py`: `name_code` and `code`). */
const ASSIGN_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  name_blank: messages.nameBlank,
  name_too_long: messages.nameTooLong,
  too_many_tags: messages.tooManyTags,
};

const codeOf = (error: unknown): string | undefined => {
  const data = (error as AxiosError<Record<string, unknown>>).response?.data ?? {};
  const code = data.name_code ?? data.code;
  return typeof code === 'string' ? code : undefined;
};

/** A known 400 code of a failed assign, else undefined. */
const assignCodeOf = (error: unknown): string | undefined => {
  const code = getErrorStatus(error) === 400 ? codeOf(error) : undefined;
  return code !== undefined && Object.prototype.hasOwnProperty.call(ASSIGN_ERROR_MESSAGES, code) ? code : undefined;
};

/**
 * The error of a failed assign, in the user's language: the message for the API's code on a 400, the permission
 * message on a 403, a plain "could not be added" for any other 4xx (asking again fails the same way), and "Try
 * again" for a 5xx or a network error.
 */
export const getAssignErrorMessage = (error: unknown, intl: IntlShape): string => {
  if (getErrorStatus(error) === 403) {
    return intl.formatMessage(messages.permissionError);
  }
  const code = assignCodeOf(error);
  if (code !== undefined) {
    return intl.formatMessage(ASSIGN_ERROR_MESSAGES[code], {
      max: code === 'too_many_tags' ? MAX_TAGS_PER_COURSE : TAG_NAME_MAX_LENGTH,
    });
  }
  return intl.formatMessage(isClientError(error) ? messages.assignRefused : messages.assignError);
};

/** Whether a failed assign is one the API documents (403, or a 400 with a known code); others are worth logging. */
export const isExpectedAssignError = (error: unknown) => (
  getErrorStatus(error) === 403 || assignCodeOf(error) !== undefined
);

/**
 * The error of a failed unassign: the permission message on a 403, a plain "could not be removed" for any other
 * 4xx, and "Try again" for a 5xx or a network error. (A 404 never gets here: `useUnassignTag` treats it as removed.)
 */
export const getUnassignErrorMessage = (error: unknown, intl: IntlShape): string => {
  if (getErrorStatus(error) === 403) {
    return intl.formatMessage(messages.permissionError);
  }
  return intl.formatMessage(isClientError(error) ? messages.unassignRefused : messages.unassignError);
};

/** Whether a failed unassign is one the API documents (403); others are worth logging. */
export const isExpectedUnassignError = (error: unknown) => getErrorStatus(error) === 403;
