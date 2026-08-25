import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  createNewCategory: {
    id: 'course-authoring.studio-home.new-category.title',
    defaultMessage: 'Add a new category',
  },
  categoryNameLabel: {
    id: 'course-authoring.studio-home.new-category.name.label',
    defaultMessage: 'Category name (English)',
  },
  categoryNamePlaceholder: {
    id: 'course-authoring.studio-home.new-category.name.placeholder',
    defaultMessage: 'e.g. Programming',
  },
  categoryNameRequired: {
    id: 'course-authoring.studio-home.new-category.name.required',
    defaultMessage: 'Category name is required.',
  },
  categorySlugLabel: {
    id: 'course-authoring.studio-home.new-category.slug.label',
    defaultMessage: 'Slug',
  },
  categorySlugPlaceholder: {
    id: 'course-authoring.studio-home.new-category.slug.placeholder',
    defaultMessage: 'e.g. programming',
  },
  categorySlugRequired: {
    id: 'course-authoring.studio-home.new-category.slug.required',
    defaultMessage: 'Slug is required.',
  },
  categorySlugHint: {
    id: 'course-authoring.studio-home.new-category.slug.hint',
    defaultMessage: 'URL-friendly identifier (lowercase, hyphens only).',
  },
  cancelBtn: {
    id: 'course-authoring.studio-home.new-category.cancel.btn',
    defaultMessage: 'Cancel',
  },
  createBtn: {
    id: 'course-authoring.studio-home.new-category.create.btn',
    defaultMessage: 'Create',
  },
  pendingBtn: {
    id: 'course-authoring.studio-home.new-category.pending.btn',
    defaultMessage: 'Creating...',
  },
});

export default messages;
