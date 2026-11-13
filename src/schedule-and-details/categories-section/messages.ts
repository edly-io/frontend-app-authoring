import { defineMessages } from '@edx/frontend-platform/i18n';

export default defineMessages({
  title: {
    id: 'course-authoring.schedule-section.categories.title',
    defaultMessage: 'Course categories',
  },
  description: {
    id: 'course-authoring.schedule-section.categories.description',
    defaultMessage: 'Choose categories for this course. Each change is saved immediately.',
  },
  select: {
    id: 'course-authoring.schedule-section.categories.select',
    defaultMessage: 'Select categories',
  },
  noneSelected: {
    id: 'course-authoring.schedule-section.categories.none-selected',
    defaultMessage: 'No categories selected.',
  },
  loading: {
    id: 'course-authoring.schedule-section.categories.loading',
    defaultMessage: 'Loading categories',
  },
  saving: {
    id: 'course-authoring.schedule-section.categories.saving',
    defaultMessage: 'Saving category changes',
  },
  empty: {
    id: 'course-authoring.schedule-section.categories.empty',
    defaultMessage: 'No categories are available.',
  },
  loadFailed: {
    id: 'course-authoring.schedule-section.categories.load-failed',
    defaultMessage: 'Categories could not be loaded. Please try again.',
  },
  saveFailed: {
    id: 'course-authoring.schedule-section.categories.save-failed',
    defaultMessage: 'The category change could not be saved. Please try again.',
  },
  retry: {
    id: 'course-authoring.schedule-section.categories.retry',
    defaultMessage: 'Retry',
  },
});
