import React, { useState } from 'react';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { Alert, Button, StandardModal } from '@openedx/paragon';
import { extractApiError } from '@edly-io/frontend-component-fbr';
import { useDeleteLocation } from './data/apiHooks';
import type { Location } from './data/types';
import messages from './messages';

interface DeleteLocationModalProps {
  location: Location;
  onClose: () => void;
  onDeleted: (deleted: Location) => void;
}

/** Confirms a delete. The backend refuses it (400 with a reason) while any session uses the location. */
const DeleteLocationModal: React.FC<DeleteLocationModalProps> = ({ location, onClose, onDeleted }) => {
  const intl = useIntl();
  const deleteMutation = useDeleteLocation();
  const [error, setError] = useState('');
  const deleting = deleteMutation.isPending;

  const confirmDelete = async () => {
    setError('');
    try {
      await deleteMutation.mutateAsync(location.id);
      onDeleted(location);
    } catch (err) {
      setError(extractApiError(err as Error, intl.formatMessage(messages.deleteError)));
    }
  };

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={intl.formatMessage(messages.deleteTitle)}
      footerNode={(
        <>
          <Button variant="tertiary" onClick={onClose} disabled={deleting}>
            {intl.formatMessage(messages.cancel)}
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting} className="ml-2">
            {intl.formatMessage(deleting ? messages.deleting : messages.delete)}
          </Button>
        </>
      )}
    >
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      <p>
        <FormattedMessage {...messages.deleteBody} values={{ name: <strong>{location.name}</strong> }} />
      </p>
    </StandardModal>
  );
};

export default DeleteLocationModal;
