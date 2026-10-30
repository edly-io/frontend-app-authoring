import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  // ── List ──────────────────────────────────────────────────────────────────
  title: { id: 'programs.holidays.title', defaultMessage: 'Public Holidays' },
  description: {
    id: 'programs.holidays.description',
    defaultMessage: 'Holidays are shown as banners on the calendar. A soft reminder appears when scheduling a session on a holiday or weekend.',
  },
  newHoliday: { id: 'programs.holidays.new', defaultMessage: 'New holiday' },
  searchPlaceholder: { id: 'programs.holidays.search.placeholder', defaultMessage: 'Search holidays…' },
  searchLabel: { id: 'programs.holidays.search.label', defaultMessage: 'Search holidays' },
  loading: { id: 'programs.holidays.loading', defaultMessage: 'Loading holidays' },
  loadError: { id: 'programs.holidays.loadError', defaultMessage: 'Failed to load holidays' },
  empty: { id: 'programs.holidays.empty', defaultMessage: 'No holidays found.' },
  columnName: { id: 'programs.holidays.column.name', defaultMessage: 'Name' },
  columnDateRange: { id: 'programs.holidays.column.dateRange', defaultMessage: 'Date Range' },
  columnDescription: { id: 'programs.holidays.column.description', defaultMessage: 'Description' },
  columnActions: { id: 'programs.holidays.column.actions', defaultMessage: 'Actions' },
  fieldDescription: { id: 'programs.holidays.field.description', defaultMessage: 'Description' },
  edit: { id: 'programs.holidays.action.edit', defaultMessage: 'Edit' },
  delete: { id: 'programs.holidays.action.delete', defaultMessage: 'Delete' },

  // ── Toasts ────────────────────────────────────────────────────────────────
  created: { id: 'programs.holidays.toast.created', defaultMessage: 'Created {name}.' },
  updated: { id: 'programs.holidays.toast.updated', defaultMessage: 'Updated {name}.' },
  deleted: { id: 'programs.holidays.toast.deleted', defaultMessage: 'Deleted {name}.' },

  // ── Delete modal ──────────────────────────────────────────────────────────
  deleteTitle: { id: 'programs.holidays.delete.title', defaultMessage: 'Delete holiday' },
  deleteBody: { id: 'programs.holidays.delete.body', defaultMessage: 'Delete {name}?' },
  deleteError: { id: 'programs.holidays.delete.error', defaultMessage: 'Failed to delete holiday' },
  deleting: { id: 'programs.holidays.delete.deleting', defaultMessage: 'Deleting…' },
  cancel: { id: 'programs.holidays.cancel', defaultMessage: 'Cancel' },

  // ── Create / edit modal ───────────────────────────────────────────────────
  modalNewTitle: { id: 'programs.holidays.modal.newTitle', defaultMessage: 'New holiday' },
  modalEditTitle: { id: 'programs.holidays.modal.editTitle', defaultMessage: 'Edit holiday' },
  modalGlobalNotice: {
    id: 'programs.holidays.modal.globalNotice',
    defaultMessage: 'Public holidays apply to {allPrograms} — they are not specific to this program.',
  },
  modalAllPrograms: { id: 'programs.holidays.modal.allPrograms', defaultMessage: 'all programs' },
  modalName: { id: 'programs.holidays.modal.name', defaultMessage: 'Name *' },
  modalNamePlaceholder: { id: 'programs.holidays.modal.name.placeholder', defaultMessage: 'e.g. Eid al-Fitr' },
  modalStartDate: { id: 'programs.holidays.modal.startDate', defaultMessage: 'Start Date *' },
  modalEndDate: { id: 'programs.holidays.modal.endDate', defaultMessage: 'End Date *' },
  modalDescription: { id: 'programs.holidays.modal.description', defaultMessage: 'Description' },
  modalDescriptionPlaceholder: { id: 'programs.holidays.modal.description.placeholder', defaultMessage: 'Optional notes' },
  nameRequired: { id: 'programs.holidays.modal.nameRequired', defaultMessage: 'Name is required' },
  startDateRequired: { id: 'programs.holidays.modal.startDateRequired', defaultMessage: 'Start date is required' },
  endDateRequired: { id: 'programs.holidays.modal.endDateRequired', defaultMessage: 'End date is required' },
  endBeforeStart: { id: 'programs.holidays.modal.endBeforeStart', defaultMessage: 'End date must be on or after start date' },
  modalSaveError: { id: 'programs.holidays.modal.saveError', defaultMessage: 'Failed to save holiday' },
  save: { id: 'programs.holidays.save', defaultMessage: 'Save' },
  saving: { id: 'programs.holidays.saving', defaultMessage: 'Saving…' },
});

export default messages;
