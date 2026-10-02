import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

/** Mirrors rwaq_features.models.CoursePricing.PRICING_CATEGORY_CHOICES. */
export type PricingCategory = 'is_free' | 'is_paid' | 'is_program_only' | 'is_part_of_subscription';

export interface CoursePricing {
  /** null when the course has no type yet (legacy courses). */
  pricingCategory: PricingCategory | null;
  /** Decimal strings, not numbers — avoids float rounding on money. */
  regularPrice: string | null;
  salePrice: string | null;
  /** Read-only, computed by the backend with 2 decimals (e.g. "25.13"), or null. */
  discountPercentage: string | null;
  /** ISO 4217 code of the regular and sale prices. */
  currency: string | null;
  pricingManagedByAdmin: boolean;
  /** program_key of the program the course is in, or null. */
  partOfProgram: string | null;
  partOfProgramName: string | null;
  /** false when the course type is locked for the current user. */
  canEdit: boolean;
}

/** Error body of a rejected PUT. `field` names the input the error belongs to, when there is one. */
export interface CoursePricingError {
  detail: string;
  field?: 'regular_price' | 'sale_price' | 'pricing_category';
}

const pricingUrl = (courseId: string) => (
  `${getConfig().STUDIO_BASE_URL}/rwaq/api/pricing/courses/${encodeURIComponent(courseId)}/`
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCoursePricing = (data: any): CoursePricing => ({
  pricingCategory: data.pricing_category ?? null,
  regularPrice: data.regular_price ?? null,
  salePrice: data.sale_price ?? null,
  discountPercentage: data.discount_percentage ?? null,
  currency: data.currency ?? null,
  pricingManagedByAdmin: data.pricing_managed_by_admin ?? false,
  partOfProgram: data.part_of_program ?? null,
  partOfProgramName: data.part_of_program_name ?? null,
  canEdit: data.can_edit ?? false,
});

export const getCoursePricing = async (courseId: string): Promise<CoursePricing> => {
  const { data } = await getAuthenticatedHttpClient().get(pricingUrl(courseId));
  return toCoursePricing(data);
};

/** Free and Program-only are also set with a PUT, with regular and sale price null. */
export const setCoursePricing = async (
  courseId: string,
  pricing: { pricingCategory: PricingCategory; regularPrice: string | null; salePrice: string | null },
): Promise<CoursePricing> => {
  const { data } = await getAuthenticatedHttpClient().put(pricingUrl(courseId), {
    pricing_category: pricing.pricingCategory,
    regular_price: pricing.regularPrice,
    sale_price: pricing.salePrice,
  });
  return toCoursePricing(data);
};
