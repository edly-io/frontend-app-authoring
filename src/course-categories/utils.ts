import type { AxiosError } from 'axios';
import type { IntlShape, MessageDescriptor } from 'react-intl';

import messages from './messages';

/** The longest category name the API accepts (uber-features ``NAME_MAX_LENGTH``). */
export const CATEGORY_NAME_MAX_LENGTH = 100;

/** The API's `name_code` values (uber-features course_categories ``api.py``) and their messages. */
const NAME_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  name_blank: messages.nameBlank,
  name_too_long: messages.nameTooLong,
  name_taken: messages.nameTaken,
  name_not_sluggable: messages.nameNotSluggable,
  name_too_similar: messages.nameTooSimilar,
};

/** The HTTP status of a failed request, or undefined for a network error. */
export const getErrorStatus = (error: unknown): number | undefined =>
  (error as AxiosError | undefined)?.response?.status;

export const isClientError = (error: unknown) => {
  const status = getErrorStatus(error);
  return status !== undefined && status >= 400 && status < 500;
};

/** The first message the API returned for `field` in a 400 (`{"field": ["message"]}`), if any. */
export const getFieldError = (error: unknown, field: string): string | undefined => {
  if (getErrorStatus(error) !== 400) {
    return undefined;
  }
  const messages = ((error as AxiosError<Record<string, unknown>>).response?.data ?? {})[field];
  return Array.isArray(messages) && typeof messages[0] === 'string' ? messages[0] : undefined;
};

/** A 403 gets the permission message; anything else the action's own message. */
export const errorMessageFor = (error: unknown, permissionMessage: string, otherMessage: string) => (
  getErrorStatus(error) === 403 ? permissionMessage : otherMessage
);

/**
 * The name error of a create or rename 400, in the user's language: the message for the API's `name_code`, or
 * the API's (English) text when the code is missing or unknown. Undefined when the 400 has no name error.
 */
export const getNameError = (error: unknown, intl: IntlShape): string | undefined => {
  const apiMessage = getFieldError(error, 'name');
  if (apiMessage === undefined) {
    return undefined;
  }
  const code = (error as AxiosError<Record<string, unknown>>).response?.data?.name_code;
  if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(NAME_ERROR_MESSAGES, code)) {
    return intl.formatMessage(NAME_ERROR_MESSAGES[code], { max: CATEGORY_NAME_MAX_LENGTH });
  }
  return apiMessage;
};
