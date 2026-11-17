import type { AxiosError } from 'axios';

/** The HTTP status of a failed request, or undefined for a network error. */
export const getErrorStatus = (error: unknown): number | undefined => (
  (error as AxiosError | undefined)?.response?.status
);

/** Whether the server answered with a 4xx. It has made up its mind, so asking again will not change it. */
export const isClientError = (error: unknown) => {
  const status = getErrorStatus(error);
  return status !== undefined && status >= 400 && status < 500;
};

/**
 * React Query `retry`: retry a network error or a 5xx up to three times, and a 4xx never.
 *
 * Without it React Query's default three retries with backoff make a 403 or a 404 - an answer rather than
 * a hiccup - take about seven seconds to reach the user.
 */
export const retryUnlessClientError = (failureCount: number, error: unknown) => (
  !isClientError(error) && failureCount < 3
);
