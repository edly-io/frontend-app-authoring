import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Form, StandardModal,
} from '@openedx/paragon';
import { extractApiError } from '@edly-io/frontend-component-fbr';
import { useCreateLocation, useUpdateLocation } from './data/apiHooks';
import type { Location, LocationPayload } from './data/types';
import messages from './messages';

interface LocationModalProps {
  onClose: () => void;
  onSuccess: (saved: Location) => void;
  /** The location to edit; `null` creates a new one. */
  location: Location | null;
  /** The program's city, sent on create. */
  cityId: number | null;
  cityName: string;
}

type LocationForm = Pick<Location, 'name' | 'description' | 'biometric_machine_serial_number'>;

const toForm = (location: Location | null): LocationForm => ({
  name: location?.name ?? '',
  description: location?.description ?? '',
  biometric_machine_serial_number: location?.biometric_machine_serial_number ?? '',
});

const toPayload = (form: LocationForm, cityId: number | null): LocationPayload => ({
  name: form.name.trim(),
  description: form.description,
  biometric_machine_serial_number: form.biometric_machine_serial_number.trim(),
  ...(cityId ? { city: cityId } : {}),
});

/**
 * Create or edit a location. Mounted only while open (and keyed by the location),
 * so the form starts from the record each time it opens.
 */
const LocationModal: React.FC<LocationModalProps> = ({
  onClose, onSuccess, location, cityId, cityName,
}) => {
  const intl = useIntl();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const [form, setForm] = useState<LocationForm>(() => toForm(location));
  const [error, setError] = useState('');
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field: keyof LocationForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const save = () => (location
    ? updateMutation.mutateAsync({ id: location.id, payload: toPayload(form, null) })
    : createMutation.mutateAsync(toPayload(form, cityId)));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(intl.formatMessage(messages.modalNameRequired));
      return;
    }
    setError('');
    try {
      onSuccess(await save());
    } catch (err) {
      setError(extractApiError(err as Error, intl.formatMessage(messages.modalSaveError)));
    }
  };

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={intl.formatMessage(location ? messages.modalEditTitle : messages.modalNewTitle)}
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

      {cityName && (
        <div className="bg-light-300 rounded-sm small mb-3 p-2">
          <span className="text-muted">{intl.formatMessage(messages.modalCity)}</span>
          <strong>{cityName}</strong>
        </div>
      )}

      <Form.Group className="mb-3">
        <Form.Label>{intl.formatMessage(messages.modalName)}</Form.Label>
        <Form.Control
          value={form.name}
          onChange={handleChange('name')}
          placeholder={intl.formatMessage(messages.modalNamePlaceholder)}
          autoFocus
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>{intl.formatMessage(messages.modalDescription)}</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={form.description}
          onChange={handleChange('description')}
          placeholder={intl.formatMessage(messages.modalDescriptionPlaceholder)}
        />
      </Form.Group>
    </StandardModal>
  );
};

export default LocationModal;
