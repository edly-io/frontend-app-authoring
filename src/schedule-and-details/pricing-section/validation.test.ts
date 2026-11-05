import { getDiscountPercent, getPriceWithVat } from './validation';

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

describe('getPriceWithVat', () => {
  it('adds VAT to the regular price', () => {
    expect(getPriceWithVat('100', '', '15.00')).toEqual({ amount: '115.00', rate: 15 });
  });

  it('prefers a valid sale price', () => {
    expect(getPriceWithVat('100', '30', '15.00')).toEqual({ amount: '34.50', rate: 15 });
  });

  it.each(['', '100', '120', '0', '-1', 'abc'])('uses the regular price for sale %j', (sale) => {
    expect(getPriceWithVat('100', sale, '15')?.amount).toBe('115.00');
  });

  it('rounds half up on the cent', () => {
    expect(getPriceWithVat('0.10', '', '15')?.amount).toBe('0.12');
    expect(getPriceWithVat('0.30', '', '15')?.amount).toBe('0.35');
  });

  it('keeps the exact cents of 1.005 at 15%', () => {
    expect(getPriceWithVat('1.005', '', '15')?.amount).toBe('1.15');
  });

  it('supports a fractional rate', () => {
    expect(getPriceWithVat('100', '', '7.5')).toEqual({ amount: '107.50', rate: 7.5 });
  });

  it('accepts numbers as well as strings', () => {
    expect(getPriceWithVat(30, null, 15)).toEqual({ amount: '34.50', rate: 15 });
  });

  it.each(['', ' ', '0', '-5', 'abc', 'Infinity', null, undefined])('is null for price %j', (price) => {
    expect(getPriceWithVat(price as string | null | undefined, '', '15')).toBeNull();
  });

  it.each(['0', '0.00', '', '  ', null, undefined, 'x', '-1'])('is null for rate %j', (rate) => {
    expect(getPriceWithVat('100', '', rate as string | null | undefined)).toBeNull();
  });
});
