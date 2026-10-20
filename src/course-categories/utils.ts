import type { AxiosError } from 'axios';

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
