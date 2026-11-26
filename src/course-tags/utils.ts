import type { AxiosError } from 'axios';
import type { IntlShape, MessageDescriptor } from 'react-intl';

import { getErrorStatus } from '@src/generic/queryErrors';
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

/**
 * The error of a failed assign, in the user's language: the message for the API's code on a 400, the permission
 * message on a 403, else the generic one.
 */
export const getAssignErrorMessage = (error: unknown, intl: IntlShape): string => {
  const status = getErrorStatus(error);
  if (status === 403) {
    return intl.formatMessage(messages.permissionError);
  }
  const code = status === 400 ? codeOf(error) : undefined;
  if (code !== undefined && Object.prototype.hasOwnProperty.call(ASSIGN_ERROR_MESSAGES, code)) {
    return intl.formatMessage(ASSIGN_ERROR_MESSAGES[code], {
      max: code === 'too_many_tags' ? MAX_TAGS_PER_COURSE : TAG_NAME_MAX_LENGTH,
    });
  }
  return intl.formatMessage(messages.assignError);
};

/** The error of a failed unassign: the permission message on a 403, else the generic one. */
export const getUnassignErrorMessage = (error: unknown, intl: IntlShape): string => (
  intl.formatMessage(getErrorStatus(error) === 403 ? messages.permissionError : messages.unassignError)
);
