import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

/** Mirrors rwaq_features.models.CoursePricing.PRICING_CATEGORY_CHOICES. */
export type PricingCategory = 'is_paid' | 'is_within_program';

export interface CoursePricing {
  /** null when the course has no pricing row at all, i.e. it is free. */
  pricingCategory: PricingCategory | null;
  /** Decimal strings, not numbers — avoids float rounding on money. */
  price: string | null;
  discount: string | null;
  /** ISO 4217 code of price and discount. null when the course is free. */
  currency: string | null;
  /**
   * Set from the Rwaq admin panel, never from here. When true this course's
   * pricing is the admin's to change and the fields below render read-only —
   * the backend refuses writes either way.
   */
  pricingManagedByAdmin: boolean;
  /**
   * program_key of the paid program the course is in, or null. While set, the
   * program is what learners buy, the course has no price of its own, and the
   * backend refuses pricing writes.
   */
  partOfProgram: string | null;
  partOfProgramName: string | null;
}

const pricingUrl = (courseId: string) => (
  `${getConfig().STUDIO_BASE_URL}/rwaq/api/pricing/courses/${encodeURIComponent(courseId)}/`
);

export const getCoursePricing = async (courseId: string): Promise<CoursePricing> => {
  const { data } = await getAuthenticatedHttpClient().get(pricingUrl(courseId));
  return {
    pricingCategory: data.pricing_category ?? null,
    price: data.price ?? null,
    discount: data.discount ?? null,
    currency: data.currency ?? null,
    pricingManagedByAdmin: data.pricing_managed_by_admin ?? false,
    partOfProgram: data.part_of_program ?? null,
    partOfProgramName: data.part_of_program_name ?? null,
  };
};

export const setCoursePricing = async (
  courseId: string,
  pricing: { pricingCategory: PricingCategory; price: string | null; discount: string | null },
): Promise<CoursePricing> => {
  const { data } = await getAuthenticatedHttpClient().put(pricingUrl(courseId), {
    pricing_category: pricing.pricingCategory,
    price: pricing.price,
    discount: pricing.discount,
  });
  return {
    pricingCategory: data.pricing_category ?? null,
    price: data.price ?? null,
    discount: data.discount ?? null,
    currency: data.currency ?? null,
    pricingManagedByAdmin: data.pricing_managed_by_admin ?? false,
    partOfProgram: data.part_of_program ?? null,
    partOfProgramName: data.part_of_program_name ?? null,
  };
};

/** Clearing pricing makes the course free again. */
export const clearCoursePricing = async (courseId: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(pricingUrl(courseId));
};
