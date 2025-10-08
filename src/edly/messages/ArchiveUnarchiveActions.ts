import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  confirmDialogTitle: {
    id: 'edly.archive-unarchive-actions.confirm-dialog.title',
    defaultMessage: 'Are you sure?',
  },
  confirmDialogCancelBtn: {
    id: 'edly.archive-unarchive-actions.confirm-dialog.btn.cancel',
    defaultMessage: 'No',
  },
  confirmDialogConfirmBtn: {
    id: 'edly.archive-unarchive-actions.confirm-dialog.btn.confirm',
    defaultMessage: 'Yes',
  },
  archiveConfirmMessage: {
    id: 'edly.archive-unarchive-actions.archive.confirm-message',
    defaultMessage: 'Courses are archived by default when they pass their end date. Are you sure you want to archive this course anyway?',
  },
  unarchiveConfirmMessage: {
    id: 'edly.archive-unarchive-actions.unarchive.confirm-message',
    defaultMessage: 'Are you sure you want to unarchive this course? End date for this course will be changed to 1 year from now. This course will still have to be published.',
  },
  archiveBtnText: {
    id: 'edly.archive-unarchive-actions.btn.archive.text',
    defaultMessage: 'Archive',
  },
  unarchiveBtnText: {
    id: 'edly.archive-unarchive-actions.btn.unarchive.text',
    defaultMessage: 'Unarchive',
  },
});

export default messages;
