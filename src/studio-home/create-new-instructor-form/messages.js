import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  createNewInstructor: {
    id: 'course-authoring.studio-home.new-instructor.title',
    defaultMessage: 'Add a new instructor',
  },
  instructorNameLabel: {
    id: 'course-authoring.studio-home.new-instructor.name.label',
    defaultMessage: 'Instructor name',
  },
  instructorNamePlaceholder: {
    id: 'course-authoring.studio-home.new-instructor.name.placeholder',
    defaultMessage: 'e.g. Jane Doe',
  },
  instructorNameRequired: {
    id: 'course-authoring.studio-home.new-instructor.name.required',
    defaultMessage: 'Instructor name is required.',
  },
  cancelBtn: {
    id: 'course-authoring.studio-home.new-instructor.cancel.btn',
    defaultMessage: 'Cancel',
  },
  createBtn: {
    id: 'course-authoring.studio-home.new-instructor.create.btn',
    defaultMessage: 'Create',
  },
  pendingBtn: {
    id: 'course-authoring.studio-home.new-instructor.pending.btn',
    defaultMessage: 'Creating...',
  },
});

export default messages;
