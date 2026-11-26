import { createIntl } from 'react-intl';

import {
  MAX_TAGS_PER_COURSE,
  TAG_NAME_MAX_LENGTH,
  getAssignErrorMessage,
  getUnassignErrorMessage,
  isSameTagName,
  normalizeTagName,
} from './utils';

const intl = createIntl({ locale: 'en' });
const failure = (status: number, data?: object) => ({ response: { status, data } });

describe('course tags utils', () => {
  it('mirrors the backend limits', () => {
    expect(TAG_NAME_MAX_LENGTH).toBe(100);
    expect(MAX_TAGS_PER_COURSE).toBe(100);
  });

  describe('normalizeTagName', () => {
    it('trims and collapses inner whitespace', () => {
      expect(normalizeTagName('  road \t  safety\n')).toBe('road safety');
    });

    it('turns blank into an empty string', () => {
      expect(normalizeTagName('   ')).toBe('');
    });
  });

  describe('isSameTagName', () => {
    it('ignores case and whitespace', () => {
      expect(isSameTagName('Road  Safety', ' road safety ')).toBe(true);
    });

    it('tells different names apart', () => {
      expect(isSameTagName('Road', 'Road safety')).toBe(false);
    });
  });

  describe('getAssignErrorMessage', () => {
    it.each([
      [{ name: ['x'], name_code: 'name_blank' }, 'Enter a tag name.'],
      [{ name: ['x'], name_code: 'name_too_long' }, 'Use at most 100 characters.'],
      [{ detail: 'x', code: 'too_many_tags' }, 'A course can have at most 100 tags. Remove one first.'],
    ])('maps the 400 body %j to its message', (data, message) => {
      expect(getAssignErrorMessage(failure(400, data), intl)).toBe(message);
    });

    it('maps a 403 to the permission message', () => {
      expect(getAssignErrorMessage(failure(403), intl)).toBe('You don\'t have permission to make this change.');
    });

    it.each([
      ['an unknown 400 code', failure(400, { code: 'brand_new' })],
      ['a 400 without a code', failure(400, { name: ['bad'] })],
      ['a prototype key as code', failure(400, { code: 'constructor' })],
      ['a non-string code', failure(400, { code: 5 })],
      ['a 500', failure(500, { code: 'too_many_tags' })],
      ['a network error', new Error('Network Error')],
    ])('falls back to the generic message for %s', (_, error) => {
      expect(getAssignErrorMessage(error, intl)).toBe('The tag could not be added. Try again.');
    });
  });

  describe('getUnassignErrorMessage', () => {
    it('maps a 403 to the permission message', () => {
      expect(getUnassignErrorMessage(failure(403), intl)).toBe('You don\'t have permission to make this change.');
    });

    it.each([404, 500])('uses the generic message for a %s', (status) => {
      expect(getUnassignErrorMessage(failure(status), intl)).toBe('The tag could not be removed. Try again.');
    });
  });
});
