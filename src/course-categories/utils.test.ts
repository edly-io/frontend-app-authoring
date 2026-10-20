import { errorMessageFor, getErrorStatus, getFieldError, isClientError } from './utils';

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

describe('course categories utils', () => {
  it('reads the HTTP status, and is undefined for a network error', () => {
    expect(getErrorStatus(httpError(403))).toBe(403);
    expect(getErrorStatus(new Error('Network Error'))).toBeUndefined();
    expect(getErrorStatus(undefined)).toBeUndefined();
  });

  it.each([[400, true], [404, true], [499, true], [500, false], [200, false]])(
    'isClientError(%s) is %s',
    (status, expected) => expect(isClientError(httpError(status))).toBe(expected),
  );

  it('does not treat a network error as a client error', () => {
    expect(isClientError(new Error('Network Error'))).toBe(false);
  });

  it('reads the first field message of a 400', () => {
    expect(getFieldError(httpError(400, { name: ['Too long.', 'Other'] }), 'name')).toBe('Too long.');
  });

  it.each([
    ['another status', httpError(403, { name: ['x'] })],
    ['no body', httpError(400)],
    ['another field', httpError(400, { category: ['x'] })],
    ['a non-list message', httpError(400, { name: 'x' })],
    ['an empty list', httpError(400, { name: [] })],
    ['a non-string message', httpError(400, { name: [5] })],
  ])('has no field error for %s', (_, error) => {
    expect(getFieldError(error, 'name')).toBeUndefined();
  });

  it('uses the permission message only for a 403', () => {
    expect(errorMessageFor(httpError(403), 'perm', 'other')).toBe('perm');
    expect(errorMessageFor(httpError(500), 'perm', 'other')).toBe('other');
    expect(errorMessageFor(new Error('x'), 'perm', 'other')).toBe('other');
  });
});
