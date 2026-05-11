import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  createNewCourse: {
    id: 'course-authoring.studio-home.new-course.title',
    defaultMessage: 'Create a new course',
  },
  targetAudienceLabel: {
    id: 'course-authoring.studio-home.new-course.target-audience.label',
    defaultMessage: 'Target Audience',
  },
  targetAudiencePlaceholder: {
    id: 'course-authoring.studio-home.new-course.target-audience.placeholder',
    defaultMessage: 'Select or add audience type...',
  },
  targetAudienceHint: {
    id: 'course-authoring.studio-home.new-course.target-audience.hint',
    defaultMessage: 'Optional. Choose an existing type or type a new one to create it.',
  },
  targetAudienceAdd: {
    id: 'course-authoring.studio-home.new-course.target-audience.add',
    defaultMessage: 'Add "{value}"',
  },
});

export default messages;
