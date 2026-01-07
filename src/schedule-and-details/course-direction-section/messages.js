import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  courseDirectionTitle: {
    id: 'authoring.schedule.course-direction.title',
    defaultMessage: 'Course Direction Flag',
  },
  courseDirectionDescription: {
    id: 'authoring.schedule.course-direction.description',
    defaultMessage: 'Convert course to Source',
  },
  courseDirectionDisabledTip: {
    id: 'authoring.schedule.course-direction.disabled-tip',
    defaultMessage: 'Option is disabled as course is not a translated re-run.',
  },
  confirmationModalTitle: {
    id: 'authoring.schedule.course-direction.confirmation-modal.title',
    defaultMessage: 'Change can not be reverted.',
  },
  confirmationModalMessage: {
    id: 'authoring.schedule.course-direction.confirmation-modal.message',
    defaultMessage: 'Are you sure you want to update flag as it will not be reverted again.',
  },
  confirmationModalCancel: {
    id: 'authoring.schedule.course-direction.confirmation-modal.cancel',
    defaultMessage: 'Cancel',
  },
  confirmationModalConfirm: {
    id: 'authoring.schedule.course-direction.confirmation-modal.confirm',
    defaultMessage: 'Yes, Update Flag',
  },
});

export default messages;

