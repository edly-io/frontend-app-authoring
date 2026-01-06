import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  dropVideoFileHere: {
    defaultMessage: 'Drag and drop video here or click to upload',
    id: 'VideoUploadEditor.dropVideoFileHere',
    description: 'Display message for Drag and Drop zone',
  },
  browse: {
    defaultMessage: 'Browse files',
    id: 'VideoUploadEditor.browse',
    description: 'Display message for browse files button',
  },
  info: {
    id: 'VideoUploadEditor.uploadInfo',
    defaultMessage: 'Upload MP4 or MOV files (5 GB max)',
    description: 'Info message for supported formats',
  },
  libraryBlockEditWarningTitle: {
    id: 'authoring.editorpage.libraryBlockEditWarningTitle',
    defaultMessage: 'Editing Content from a Library',
    description: 'Title text for Warning users editing library content in a course.',
  },
  libraryBlockEditWarningDescription: {
    id: 'authoring.editorpage.libraryBlockEditWarningDescription',
    defaultMessage: 'Edits made here will only be reflected in this course. These edits may be overridden later if updates are accepted.',
    description: 'Description text for Warning users editing library content in a course.',
  },
  libraryBlockEditWarningLink: {
    id: 'authoring.editorpage.libraryBlockEditWarningLink',
    defaultMessage: 'View in Library',
    description: 'Link text for opening library block in another tab.',
  },
  advancedEditorGenericError: {
    id: 'authoring.advancedEditor.error.generic',
    defaultMessage: 'An unexpected error occurred in the editor',
    description: 'Generic error message shown when an error occurs in the Advanced Editor.',
  },
  editTranslatedRerunTitle: {
    id: 'authoring.editor.edit.translated-rerun.title',
    defaultMessage: 'Edit on Translated rerun?',
    description: 'Title for confirmation dialog when editing translated rerun.',
  },
  editTranslatedRerunBody: {
    id: 'authoring.editor.edit.translated-rerun.body',
    defaultMessage: 'Please disable translations after an edit, otherwise edited component will be overwritten by auto next applied translations.',
    description: 'Body text for confirmation dialog when editing translated rerun.',
  },
  editBaseCourseTitle: {
    id: 'authoring.editor.edit.base-course.title',
    defaultMessage: 'Edit on Base Course Block?',
    description: 'Title for confirmation dialog when editing base course block.',
  },
  editBaseCourseBody: {
    id: 'authoring.editor.edit.base-course.body',
    defaultMessage: 'If you edit base block content all linked translated-rerun blocks translations will be lost and all previous version history will be deleted.',
    description: 'Body text for confirmation dialog when editing base course block.',
  },
  continueEditingButton: {
    id: 'authoring.editor.edit.continue-editing.button',
    defaultMessage: 'Continue Editing',
    description: 'Button label to continue with editing after confirmation.',
  },
  cancelButton: {
    id: 'authoring.editor.edit.cancel.button',
    defaultMessage: 'Cancel',
    description: 'Button label to cancel editing.',
  },
});

export default messages;
