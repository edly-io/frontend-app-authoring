import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  headingTitle: {
    id: 'course-authoring.import.file-section.title',
    defaultMessage: 'Select a .tar.gz file to replace your course content',
  },
  fileChosen: {
    id: 'course-authoring.import.file-section.chosen-file',
    defaultMessage: 'File chosen: {fileName}',
  },
  enableDraftStateLabel: {
    id: 'course-authoring.import.file-section.enable-draft-state.label',
    defaultMessage: 'Enable Draft State',
  },
  enableDraftStateDescription: {
    id: 'course-authoring.import.file-section.enable-draft-state.description',
    defaultMessage: 'Import all content as draft. Nothing will be visible to learners until you manually publish from Studio.',
  },
});

export default messages;
