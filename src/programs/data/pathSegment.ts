/**
 * One URL path segment. Ids and program keys can come from the page URL, so each one is
 * encoded to stay inside its own segment of the API path.
 */
export const pathSegment = (value: number | string): string => encodeURIComponent(String(value));
