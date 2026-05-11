import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  sectionTitle: {
    id: 'course-authoring.schedule-section.target-audience.title',
    defaultMessage: 'Target Audience',
  },
  sectionDescription: {
    id: 'course-authoring.schedule-section.target-audience.description',
    defaultMessage: 'The audience this course is designed for.',
  },
  fieldLabel: {
    id: 'course-authoring.schedule-section.target-audience.label',
    defaultMessage: 'Target audience',
  },
  fieldHint: {
    id: 'course-authoring.schedule-section.target-audience.hint',
    defaultMessage: 'Select an existing audience type or create a new one.',
  },
  fieldPlaceholder: {
    id: 'course-authoring.schedule-section.target-audience.placeholder',
    defaultMessage: 'Select or add audience type...',
  },
  saveBtn: {
    id: 'course-authoring.schedule-section.target-audience.save',
    defaultMessage: 'Save',
  },
  cancelBtn: {
    id: 'course-authoring.schedule-section.target-audience.cancel',
    defaultMessage: 'Cancel',
  },
  savedSuccess: {
    id: 'course-authoring.schedule-section.target-audience.success',
    defaultMessage: 'Target audience saved.',
  },
  savedError: {
    id: 'course-authoring.schedule-section.target-audience.error',
    defaultMessage: 'Failed to save target audience. Please try again.',
  },
  audienceAdd: {
    id: 'course-authoring.schedule-section.target-audience.add',
    defaultMessage: 'Add "{value}"',
  },
});

export default messages;
