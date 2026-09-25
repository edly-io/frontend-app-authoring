import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  title: {
    id: 'course-authoring.schedule-section.pricing.title',
    defaultMessage: 'Type of course',
  },
  description: {
    id: 'course-authoring.schedule-section.pricing.description',
    defaultMessage: 'Set how learners get this course. Prices are published to the marketing site.',
  },
  categoryFree: {
    id: 'course-authoring.schedule-section.pricing.category-free',
    defaultMessage: 'Free',
  },
  categoryFreeDescription: {
    id: 'course-authoring.schedule-section.pricing.category-free.description',
    defaultMessage: 'Learners enroll at no cost.',
  },
  categoryPaid: {
    id: 'course-authoring.schedule-section.pricing.category-paid',
    defaultMessage: 'Paid',
  },
  categoryPaidDescription: {
    id: 'course-authoring.schedule-section.pricing.category-paid.description',
    defaultMessage: 'Sold on its own at the price set below.',
  },
  categoryProgramOnly: {
    id: 'course-authoring.schedule-section.pricing.category-program-only',
    defaultMessage: 'Program-only course',
  },
  categoryProgramOnlyDescription: {
    id: 'course-authoring.schedule-section.pricing.category-program-only.description',
    defaultMessage: 'Offered only through the one program it is added to.',
  },
  noTypeHint: {
    id: 'course-authoring.schedule-section.pricing.no-type-hint',
    defaultMessage: 'This course has no type yet. Choose one and save.',
  },
  priceLabel: {
    id: 'course-authoring.schedule-section.pricing.price-label',
    defaultMessage: 'Price ({currency})',
  },
  priceHint: {
    id: 'course-authoring.schedule-section.pricing.price-hint',
    defaultMessage: 'Regular price shown on the marketing site.',
  },
  discountLabel: {
    id: 'course-authoring.schedule-section.pricing.discount-label',
    defaultMessage: 'Sale price ({currency})',
  },
  discountHint: {
    id: 'course-authoring.schedule-section.pricing.discount-hint',
    defaultMessage: 'Optional. Leave empty when the course is not on sale.',
  },
  saveBtn: {
    id: 'course-authoring.schedule-section.pricing.save-btn',
    defaultMessage: 'Save course type',
  },
  savingBtn: {
    id: 'course-authoring.schedule-section.pricing.saving-btn',
    defaultMessage: 'Saving…',
  },
  savedMsg: {
    id: 'course-authoring.schedule-section.pricing.saved-msg',
    defaultMessage: 'Course type saved.',
  },
  errorPriceNotPositive: {
    id: 'course-authoring.schedule-section.pricing.error-price-not-positive',
    defaultMessage: 'Price must be greater than 0.',
  },
  errorSalePriceTooHigh: {
    id: 'course-authoring.schedule-section.pricing.error-sale-price-too-high',
    defaultMessage: 'Sale price must be lower than the price.',
  },
  errorSaveFailed: {
    id: 'course-authoring.schedule-section.pricing.error-save-failed',
    defaultMessage: 'Could not save the course type. Please try again.',
  },
  errorLoadFailed: {
    id: 'course-authoring.schedule-section.pricing.error-load-failed',
    defaultMessage: 'Could not load the course type. Refresh the page to try again.',
  },
  partOfProgram: {
    id: 'course-authoring.schedule-section.pricing.part-of-program',
    defaultMessage: 'This course is in the program {program}. Its type cannot change while it is in the program.',
  },
  managedByAdmin: {
    id: 'course-authoring.schedule-section.pricing.managed-by-admin',
    defaultMessage: 'The type and price of this course are managed by the Rwaq admin and cannot be changed here.',
  },
});

export default messages;
