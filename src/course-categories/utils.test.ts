import { createIntl } from 'react-intl';

import messages from './messages';
import {
  errorMessageFor,
  getErrorStatus,
  getFieldError,
  getNameError,
  isClientError,
} from './utils';

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

  describe('getNameError', () => {
    const intl = createIntl({ locale: 'en', messages: {} });
    const nameError = (data: unknown) => getNameError(httpError(400, data), intl);

    it.each([
      ['name_blank', 'Enter a category name.'],
      ['name_too_long', 'Use at most 100 characters.'],
      ['name_taken', 'A category with this name already exists.'],
      ['name_not_sluggable', 'Use at least one letter or digit (A-Z, 0-9).'],
      ['name_too_similar', 'Too many categories have a similar name. Choose a more distinct name.'],
    ])('shows our message for %s, not the API text', (code, expected) => {
      expect(nameError({ name: ['API text'], name_code: code })).toBe(expected);
    });

    it('shows the translation for the code', () => {
      const spanish = createIntl({
        locale: 'es',
        messages: { [messages.nameTaken.id]: 'Ya existe una categoría con este nombre.' },
      });
      expect(getNameError(httpError(400, { name: ['API text'], name_code: 'name_taken' }), spanish))
        .toBe('Ya existe una categoría con este nombre.');
    });

    it.each([
      ['a missing code', { name: ['API text'] }],
      ['an unknown code', { name: ['API text'], name_code: 'name_new_rule' }],
      ['an inherited property name', { name: ['API text'], name_code: 'toString' }],
      ['a non-string code', { name: ['API text'], name_code: 5 }],
    ])('falls back to the API text for %s', (_, data) => {
      expect(nameError(data)).toBe('API text');
    });

    it('is undefined when the 400 has no name error', () => {
      expect(nameError({ name_code: 'name_taken' })).toBeUndefined();
      expect(getNameError(httpError(500, { name: ['x'], name_code: 'name_taken' }), intl)).toBeUndefined();
    });
  });

  it('uses the permission message only for a 403', () => {
    expect(errorMessageFor(httpError(403), 'perm', 'other')).toBe('perm');
    expect(errorMessageFor(httpError(500), 'perm', 'other')).toBe('other');
    expect(errorMessageFor(new Error('x'), 'perm', 'other')).toBe('other');
  });
});
