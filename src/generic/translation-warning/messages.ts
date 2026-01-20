import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  editTranslatedRerunTitle: {
    id: 'course-authoring.translation-warning.edit.translated-rerun.title',
    defaultMessage: 'Edit on Translated rerun?',
    description: 'Title for confirmation dialog when editing translated rerun.',
  },
  editTranslatedRerunBody: {
    id: 'course-authoring.translation-warning.edit.translated-rerun.body',
    defaultMessage: 'Please disable translations after an edit, otherwise edited component will be overwritten by auto next applied translations.',
    description: 'Body text for confirmation dialog when editing translated rerun.',
  },
  editBaseCourseTitle: {
    id: 'course-authoring.translation-warning.edit.base-course.title',
    defaultMessage: 'Edit on Base Course Block?',
    description: 'Title for confirmation dialog when editing base course block.',
  },
  editBaseCourseBody: {
    id: 'course-authoring.translation-warning.edit.base-course.body',
    defaultMessage: 'If you edit base block content all linked translated-rerun blocks translations will be lost and all previous version history will be deleted.',
    description: 'Body text for confirmation dialog when editing base course block.',
  },
  continueEditingButton: {
    id: 'course-authoring.translation-warning.edit.continue-editing.button',
    defaultMessage: 'Continue Editing',
    description: 'Button label to continue with editing after confirmation.',
  },
  cancelButton: {
    id: 'course-authoring.translation-warning.edit.cancel.button',
    defaultMessage: 'Cancel',
    description: 'Button label to cancel editing.',
  },
});

export default messages;

