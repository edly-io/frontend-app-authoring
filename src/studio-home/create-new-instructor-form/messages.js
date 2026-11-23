import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  createNewInstructor: {
    id: 'course-authoring.studio-home.new-instructor.title',
    defaultMessage: 'Add a new instructor',
  },
  userRequired: {
    id: 'course-authoring.studio-home.new-instructor.user.required',
    defaultMessage: 'Select a user to create an instructor.',
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
