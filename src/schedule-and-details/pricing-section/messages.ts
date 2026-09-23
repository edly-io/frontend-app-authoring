import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  title: {
    id: 'course-authoring.schedule-section.pricing.title',
    defaultMessage: 'Pricing',
  },
  description: {
    id: 'course-authoring.schedule-section.pricing.description',
    defaultMessage: 'Set how this course is sold. Prices are published to the marketing site.',
  },
  categoryLabel: {
    id: 'course-authoring.schedule-section.pricing.category-label',
    defaultMessage: 'Pricing type',
  },
  categoryFree: {
    id: 'course-authoring.schedule-section.pricing.category-free',
    defaultMessage: 'Free',
  },
  categoryPaid: {
    id: 'course-authoring.schedule-section.pricing.category-paid',
    defaultMessage: 'Paid — sold on its own',
  },
  categoryWithinProgram: {
    id: 'course-authoring.schedule-section.pricing.category-within-program',
    defaultMessage: 'Part of a paid program',
  },
  withinProgramHint: {
    id: 'course-authoring.schedule-section.pricing.within-program-hint',
    defaultMessage: 'The program is the sellable unit, so this course carries no price of its own.',
  },
  priceLabel: {
    id: 'course-authoring.schedule-section.pricing.price-label',
    defaultMessage: 'Price',
  },
  priceHint: {
    id: 'course-authoring.schedule-section.pricing.price-hint',
    defaultMessage: 'Regular price shown on the marketing site.',
  },
  discountLabel: {
    id: 'course-authoring.schedule-section.pricing.discount-label',
    defaultMessage: 'Discounted price',
  },
  discountHint: {
    id: 'course-authoring.schedule-section.pricing.discount-hint',
    defaultMessage: 'Optional. Leave empty when the course is not on sale.',
  },
  saveBtn: {
    id: 'course-authoring.schedule-section.pricing.save-btn',
    defaultMessage: 'Save pricing',
  },
  savingBtn: {
    id: 'course-authoring.schedule-section.pricing.saving-btn',
    defaultMessage: 'Saving…',
  },
  savedMsg: {
    id: 'course-authoring.schedule-section.pricing.saved-msg',
    defaultMessage: 'Pricing saved.',
  },
  errorPriceRequired: {
    id: 'course-authoring.schedule-section.pricing.error-price-required',
    defaultMessage: 'Enter a price for a paid course.',
  },
  errorDiscountTooHigh: {
    id: 'course-authoring.schedule-section.pricing.error-discount-too-high',
    defaultMessage: 'The discounted price must be lower than the regular price.',
  },
  errorNegative: {
    id: 'course-authoring.schedule-section.pricing.error-negative',
    defaultMessage: 'Prices cannot be negative.',
  },
  errorSaveFailed: {
    id: 'course-authoring.schedule-section.pricing.error-save-failed',
    defaultMessage: 'Could not save pricing. Please try again.',
  },
  managedByAdmin: {
    id: 'course-authoring.schedule-section.pricing.managed-by-admin',
    defaultMessage: 'Pricing for this course is managed by the Rwaq admin team and cannot be changed here.',
  },
});

export default messages;
