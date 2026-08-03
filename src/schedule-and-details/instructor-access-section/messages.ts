import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  title: {
    id: 'course-authoring.schedule-section.instructor-access.title',
    defaultMessage: 'Instructor Profiles',
  },
  description: {
    id: 'course-authoring.schedule-section.instructor-access.description',
    defaultMessage: 'Link instructor profiles created in <mgmtLink>Instructor Management</mgmtLink> to this course',
  },
  linkBtn: {
    id: 'course-authoring.schedule-section.instructor-access.link-btn',
    defaultMessage: 'Link Instructor',
  },
  editBtn: {
    id: 'course-authoring.schedule-section.instructor-access.edit-btn',
    defaultMessage: 'Edit',
  },
  unlinkBtn: {
    id: 'course-authoring.schedule-section.instructor-access.unlink-btn',
    defaultMessage: 'Unlink',
  },
  empty: {
    id: 'course-authoring.schedule-section.instructor-access.empty',
    defaultMessage: 'No instructor profiles linked yet. Click \'Link Instructor\' to begin.',
  },
  modalTitle: {
    id: 'course-authoring.schedule-section.instructor-access.modal.title',
    defaultMessage: 'Link Instructor to Course',
  },
  modalSubtitle: {
    id: 'course-authoring.schedule-section.instructor-access.modal.subtitle',
    defaultMessage: 'Select an existing instructor profile',
  },
  modalSearchPlaceholder: {
    id: 'course-authoring.schedule-section.instructor-access.modal.search',
    defaultMessage: 'Search instructors...',
  },
  modalAddBtn: {
    id: 'course-authoring.schedule-section.instructor-access.modal.add',
    defaultMessage: 'Link',
  },
  modalAddingBtn: {
    id: 'course-authoring.schedule-section.instructor-access.modal.adding',
    defaultMessage: 'Linking...',
  },
  modalAddedBadge: {
    id: 'course-authoring.schedule-section.instructor-access.modal.added',
    defaultMessage: 'Linked',
  },
  modalCancelBtn: {
    id: 'course-authoring.schedule-section.instructor-access.modal.cancel',
    defaultMessage: 'Cancel',
  },
  modalNoResults: {
    id: 'course-authoring.schedule-section.instructor-access.modal.no-results',
    defaultMessage: 'No instructors match your search.',
  },
  modalAddError: {
    id: 'course-authoring.schedule-section.instructor-access.modal.add-error',
    defaultMessage: 'Failed to link instructor. Please try again.',
  },
  modalEmpty: {
    id: 'course-authoring.schedule-section.instructor-access.modal.empty',
    defaultMessage: 'No instructor profiles exist yet. Create one from the Instructors screen on Studio Home first.',
  },
});

export default messages;
