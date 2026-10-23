import React, { useState } from 'react';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { Alert, Button, StandardModal } from '@openedx/paragon';
import { extractApiError } from '@edly-io/frontend-component-fbr';
import { useDeleteHoliday } from './data/apiHooks';
import type { Holiday } from './data/types';
import messages from './messages';

interface DeleteHolidayModalProps {
  holiday: Holiday;
  onClose: () => void;
  onDeleted: (deleted: Holiday) => void;
}

const DeleteHolidayModal: React.FC<DeleteHolidayModalProps> = ({ holiday, onClose, onDeleted }) => {
  const intl = useIntl();
  const deleteMutation = useDeleteHoliday();
  const [error, setError] = useState('');
  const deleting = deleteMutation.isPending;

  const confirmDelete = async () => {
    setError('');
    try {
      await deleteMutation.mutateAsync(holiday.id);
      onDeleted(holiday);
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
        <FormattedMessage {...messages.deleteBody} values={{ name: <strong>{holiday.name}</strong> }} />
      </p>
    </StandardModal>
  );
};

export default DeleteHolidayModal;
