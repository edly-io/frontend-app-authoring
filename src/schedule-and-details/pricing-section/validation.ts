/**
 * Price checks shared by the course "Type of course" section and the program
 * page. Values are the raw strings from the inputs.
 */

export const isPriceValid = (price: string): boolean => price.trim() !== '' && Number(price) > 0;

/** An empty sale price is valid. It is only compared once the price itself is valid. */
export const isSalePriceValid = (price: string, salePrice: string): boolean => (
  salePrice.trim() === '' || !isPriceValid(price) || Number(salePrice) < Number(price)
);
