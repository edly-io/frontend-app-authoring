import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  // ── View switch ───────────────────────────────────────────────────────────
  viewList: { id: 'programs.locations.view.list', defaultMessage: 'Locations' },
  viewAuditLog: { id: 'programs.locations.view.auditLog', defaultMessage: 'Audit Log' },

  // ── List ──────────────────────────────────────────────────────────────────
  title: { id: 'programs.locations.title', defaultMessage: 'Locations' },
  description: {
    id: 'programs.locations.description',
    defaultMessage: 'Physical venues where in-person sessions are held. Create them once here, then pick one when scheduling a meeting.',
  },
  newLocation: { id: 'programs.locations.new', defaultMessage: 'New location' },
  searchPlaceholder: { id: 'programs.locations.search.placeholder', defaultMessage: 'Search locations…' },
  searchLabel: { id: 'programs.locations.search.label', defaultMessage: 'Search locations' },
  loading: { id: 'programs.locations.loading', defaultMessage: 'Loading locations' },
  loadError: { id: 'programs.locations.loadError', defaultMessage: 'Failed to load locations' },
  empty: { id: 'programs.locations.empty', defaultMessage: 'No locations found.' },
  columnName: { id: 'programs.locations.column.name', defaultMessage: 'Name' },
  columnCity: { id: 'programs.locations.column.city', defaultMessage: 'City' },
  columnDescription: { id: 'programs.locations.column.description', defaultMessage: 'Description' },
  columnActions: { id: 'programs.locations.column.actions', defaultMessage: 'Actions' },
  fieldDescription: { id: 'programs.locations.field.description', defaultMessage: 'Description' },
  fieldBiometricSerial: { id: 'programs.locations.field.biometricSerial', defaultMessage: 'Biometric serial' },
  edit: { id: 'programs.locations.action.edit', defaultMessage: 'Edit' },
  delete: { id: 'programs.locations.action.delete', defaultMessage: 'Delete' },
  history: { id: 'programs.locations.action.history', defaultMessage: 'History' },

  // ── Toasts ────────────────────────────────────────────────────────────────
  created: { id: 'programs.locations.toast.created', defaultMessage: 'Created {name}.' },
  updated: { id: 'programs.locations.toast.updated', defaultMessage: 'Updated {name}.' },
  deleted: { id: 'programs.locations.toast.deleted', defaultMessage: 'Deleted {name}.' },

  // ── Delete modal ──────────────────────────────────────────────────────────
  deleteTitle: { id: 'programs.locations.delete.title', defaultMessage: 'Delete location' },
  deleteBody: {
    id: 'programs.locations.delete.body',
    defaultMessage: 'Delete {name}? The backend will block this if any sessions still reference it.',
  },
  deleteError: { id: 'programs.locations.delete.error', defaultMessage: 'Failed to delete location' },
  deleting: { id: 'programs.locations.delete.deleting', defaultMessage: 'Deleting…' },
  cancel: { id: 'programs.locations.cancel', defaultMessage: 'Cancel' },

  // ── Create / edit modal ───────────────────────────────────────────────────
  modalNewTitle: { id: 'programs.locations.modal.newTitle', defaultMessage: 'New location' },
  modalEditTitle: { id: 'programs.locations.modal.editTitle', defaultMessage: 'Edit location' },
  modalCity: { id: 'programs.locations.modal.city', defaultMessage: 'City: ' },
  modalName: { id: 'programs.locations.modal.name', defaultMessage: 'Name *' },
  modalNamePlaceholder: { id: 'programs.locations.modal.name.placeholder', defaultMessage: 'e.g. IRSA 1' },
  modalNameRequired: { id: 'programs.locations.modal.name.required', defaultMessage: 'Name is required' },
  modalDescription: { id: 'programs.locations.modal.description', defaultMessage: 'Description' },
  modalDescriptionPlaceholder: {
    id: 'programs.locations.modal.description.placeholder',
    defaultMessage: 'Optional — building, floor, capacity, etc.',
  },
  modalSaveError: { id: 'programs.locations.modal.saveError', defaultMessage: 'Failed to save location' },
  save: { id: 'programs.locations.save', defaultMessage: 'Save' },
  saving: { id: 'programs.locations.saving', defaultMessage: 'Saving…' },
});

export default messages;
