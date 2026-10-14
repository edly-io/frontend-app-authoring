/**
 * Price checks shared by the course "Type of course" section and the program
 * page. Values are the raw strings from the inputs.
 */

export const isPriceValid = (regularPrice: string): boolean => regularPrice.trim() !== '' && Number(regularPrice) > 0;

/** An empty sale price is valid. It is only compared once the price itself is valid. */
export const isSalePriceValid = (regularPrice: string, salePrice: string): boolean => (
  salePrice.trim() === '' || !isPriceValid(regularPrice) || Number(salePrice) < Number(regularPrice)
);

/**
 * Whole-number percent off, computed live from the raw input strings. Null
 * unless both are valid numbers with regular > 0 and 0 < sale < regular.
 */
export const getDiscountPercent = (
  regularPrice: string | number | null | undefined,
  salePrice: string | number | null | undefined,
): number | null => {
  // Formik's number inputs may hold a number, so normalize to a string first.
  const regularText = String(regularPrice ?? '').trim();
  const saleText = String(salePrice ?? '').trim();
  if (regularText === '' || saleText === '') { return null; }
  const regular = Number(regularText);
  const sale = Number(saleText);
  if (!Number.isFinite(regular) || !Number.isFinite(sale)) { return null; }
  if (!(regular > 0) || !(sale > 0) || !(sale < regular)) { return null; }
  return Math.round(((regular - sale) / regular) * 100);
};
