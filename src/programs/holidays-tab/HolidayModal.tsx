import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Form, StandardModal,
} from '@openedx/paragon';
import { DatepickerControl, extractApiError } from '@edly-io/frontend-component-fbr';
import { useCreateHoliday, useUpdateHoliday } from './data/apiHooks';
import type { Holiday, HolidayPayload } from './data/types';
import messages from './messages';

interface HolidayModalProps {
  onClose: () => void;
  onSuccess: (saved: Holiday) => void;
  /** The holiday to edit; `null` creates a new one. */
  holiday: Holiday | null;
}

const START_DATE_ID = 'holiday-start-date';
const END_DATE_ID = 'holiday-end-date';

const toForm = (holiday: Holiday | null): HolidayPayload => ({
  name: holiday?.name ?? '',
  start_date: holiday?.start_date ?? '',
  end_date: holiday?.end_date ?? '',
  description: holiday?.description ?? '',
});

/** The first problem with the form, as a message descriptor, or `null` when it can be saved. */
const getValidationError = (form: HolidayPayload) => {
  if (!form.name.trim()) { return messages.nameRequired; }
  if (!form.start_date) { return messages.startDateRequired; }
  if (!form.end_date) { return messages.endDateRequired; }
  if (form.end_date < form.start_date) { return messages.endBeforeStart; }
  return null;
};

/** Keeps the end date on or after the start date while the start date moves. */
const withField = (form: HolidayPayload, field: keyof HolidayPayload, value: string): HolidayPayload => {
  const next = { ...form, [field]: value };
  if (field === 'start_date' && (!next.end_date || next.end_date < value)) {
    next.end_date = value;
  }
  return next;
};

/**
 * Create or edit a public holiday. Mounted only while open (and keyed by the holiday),
 * so the form starts from the record each time it opens.
 */
const HolidayModal: React.FC<HolidayModalProps> = ({ onClose, onSuccess, holiday }) => {
  const intl = useIntl();
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const [form, setForm] = useState<HolidayPayload>(() => toForm(holiday));
  const [error, setError] = useState('');
  const saving = createMutation.isPending || updateMutation.isPending;

  const updateField = (field: keyof HolidayPayload, value: string) => setForm((prev) => withField(prev, field, value));

  const save = (payload: HolidayPayload) => (holiday
    ? updateMutation.mutateAsync({ id: holiday.id, payload })
    : createMutation.mutateAsync(payload));

  const handleSave = async () => {
    const validationError = getValidationError(form);
    if (validationError) {
      setError(intl.formatMessage(validationError));
      return;
    }
    setError('');
    try {
      onSuccess(await save({ ...form, name: form.name.trim() }));
    } catch (err) {
      setError(extractApiError(err as Error, intl.formatMessage(messages.modalSaveError)));
    }
  };

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={intl.formatMessage(holiday ? messages.modalEditTitle : messages.modalNewTitle)}
      isFullscreenOnMobile
      footerNode={(
        <>
          <Button variant="tertiary" onClick={onClose} disabled={saving}>
            {intl.formatMessage(messages.cancel)}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} className="ml-2">
            {intl.formatMessage(saving ? messages.saving : messages.save)}
          </Button>
        </>
      )}
    >
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

      <Alert variant="info" className="mb-3">
        {intl.formatMessage(messages.modalGlobalNotice, {
          allPrograms: <strong>{intl.formatMessage(messages.modalAllPrograms)}</strong>,
        })}
      </Alert>

      <Form.Group className="mb-3">
        <Form.Label>{intl.formatMessage(messages.modalName)}</Form.Label>
        <Form.Control
          value={form.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
          placeholder={intl.formatMessage(messages.modalNamePlaceholder)}
          autoFocus
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId={START_DATE_ID}>
        <Form.Label>{intl.formatMessage(messages.modalStartDate)}</Form.Label>
        <DatepickerControl
          id={START_DATE_ID}
          value={form.start_date}
          onChange={(value) => updateField('start_date', value)}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId={END_DATE_ID}>
        <Form.Label>{intl.formatMessage(messages.modalEndDate)}</Form.Label>
        <DatepickerControl
          id={END_DATE_ID}
          value={form.end_date}
          onChange={(value) => updateField('end_date', value)}
          minDate={form.start_date}
        />
      </Form.Group>

      <Form.Group className="mb-0">
        <Form.Label>{intl.formatMessage(messages.modalDescription)}</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={form.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('description', e.target.value)}
          placeholder={intl.formatMessage(messages.modalDescriptionPlaceholder)}
        />
      </Form.Group>
    </StandardModal>
  );
};

export default HolidayModal;
