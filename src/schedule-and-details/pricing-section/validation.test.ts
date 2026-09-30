import { getDiscountPercent } from './validation';

describe('getDiscountPercent', () => {
  it('rounds to a whole number', () => {
    expect(getDiscountPercent('200', '150')).toBe(25);
    expect(getDiscountPercent('100', '74.87')).toBe(25);
    expect(getDiscountPercent('300', '150')).toBe(50);
  });

  it.each([
    ['', '50'], ['100', ''], ['abc', '5'], ['100', 'x'], ['0', '0'], ['-5', '1'],
    ['100', '0'], ['100', '100'], ['100', '120'], ['100', '-1'], ['Infinity', '5'],
  ])('is null for %j and %j', (regular, sale) => {
    expect(getDiscountPercent(regular, sale)).toBeNull();
  });
});
