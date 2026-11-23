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

export interface PriceWithVat {
  /** Amount the learner pays, with 2 decimals, e.g. "34.50". */
  amount: string;
  /** VAT rate as a plain number for display, e.g. 15 or 7.5. */
  rate: number;
}

/**
 * What the learner pays: the sale price when it is valid, else the regular
 * price, plus VAT (rounded half up to 2 places). Null when the price is empty
 * or invalid, or the rate is missing or 0. Prices stay VAT-exclusive, this is
 * display only.
 */
export const getPriceWithVat = (
  regularPrice: string | number | null | undefined,
  salePrice: string | number | null | undefined,
  vatRate: string | number | null | undefined,
): PriceWithVat | null => {
  const regularText = String(regularPrice ?? '').trim();
  const saleText = String(salePrice ?? '').trim();
  if (!isPriceValid(regularText)) { return null; }
  const rate = Number(String(vatRate ?? '').trim() === '' ? 0 : vatRate);
  if (!Number.isFinite(rate) || !(rate > 0)) { return null; }
  const regular = Number(regularText);
  const sale = Number(saleText);
  if (!Number.isFinite(regular)) { return null; }
  const useSale = saleText !== '' && Number.isFinite(sale) && sale > 0 && sale < regular;
  // Integer math in cents and basis points avoids float errors such as 1.005.
  const cents = Math.round((useSale ? sale : regular) * 100);
  const rateBasisPoints = Math.round(rate * 100);
  const totalCents = Math.floor((cents * (10000 + rateBasisPoints) + 5000) / 10000);
  return { amount: (totalCents / 100).toFixed(2), rate };
};
