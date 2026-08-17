import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  courseBeingCreatedMessage: {
    id: 'course-authoring.course-not-found.course-being-created.message',
    defaultMessage: 'This course is being created. This page will update automatically once it’s ready.',
    description: 'Shown in place of a course-authoring page when the course is a rerun that is still being created asynchronously.',
  },
  rerunFailedMessage: {
    id: 'course-authoring.course-not-found.rerun-failed.message',
    defaultMessage: 'A system error occurred while this course was being created. Please try the re-run again from Studio Home, or contact your PM for assistance.',
    description: 'Shown when a course rerun failed, in place of the course-authoring page for the course that failed to be created.',
  },
  backToStudioHomeButton: {
    id: 'course-authoring.course-not-found.back-to-studio-home.button',
    defaultMessage: 'Back to Studio Home',
    description: 'Button label to navigate back to Studio Home from the rerun-failed message.',
  },
  courseNotFoundAlertMessage: {
    id: 'course-authoring.course-not-found.redirect-alert.message',
    defaultMessage: 'The course you tried to open could not be found. It may have been deleted, or the link may be incorrect.',
    description: 'Dismissible alert shown on Studio Home after being redirected away from a course URL that does not exist.',
  },
});

export default messages;
