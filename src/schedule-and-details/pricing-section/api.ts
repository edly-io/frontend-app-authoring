import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

/** Mirrors rwaq_features.models.CoursePricing.PRICING_CATEGORY_CHOICES. */
export type PricingCategory = 'is_free' | 'is_paid' | 'is_program_only';

export interface CoursePricing {
  /** null when the course has no type yet (legacy courses). */
  pricingCategory: PricingCategory | null;
  /** Decimal strings, not numbers — avoids float rounding on money. */
  price: string | null;
  /** The sale price. */
  discount: string | null;
  /** ISO 4217 code of price and discount. */
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
  field?: 'price' | 'discount' | 'pricing_category';
}

const pricingUrl = (courseId: string) => (
  `${getConfig().STUDIO_BASE_URL}/rwaq/api/pricing/courses/${encodeURIComponent(courseId)}/`
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCoursePricing = (data: any): CoursePricing => ({
  pricingCategory: data.pricing_category ?? null,
  price: data.price ?? null,
  discount: data.discount ?? null,
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

/** Free and Program-only are also set with a PUT, with price and discount null. */
export const setCoursePricing = async (
  courseId: string,
  pricing: { pricingCategory: PricingCategory; price: string | null; discount: string | null },
): Promise<CoursePricing> => {
  const { data } = await getAuthenticatedHttpClient().put(pricingUrl(courseId), {
    pricing_category: pricing.pricingCategory,
    price: pricing.price,
    discount: pricing.discount,
  });
  return toCoursePricing(data);
};
