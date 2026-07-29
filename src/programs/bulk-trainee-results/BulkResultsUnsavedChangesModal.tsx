import React from 'react';
import {
  ActionRow, Button, ModalDialog, StatefulButton,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  title: { id: 'programs.bulk-trainee-results.unsaved-changes.title', defaultMessage: 'Unsaved changes on this page' },
  body: {
    id: 'programs.bulk-trainee-results.unsaved-changes.body',
    defaultMessage: '{count, plural, one {# trainee has} other {# trainees have}} unsaved scores on this page. Leaving now will discard them.',
  },
  cancelBtn: { id: 'programs.bulk-trainee-results.unsaved-changes.cancel-btn', defaultMessage: 'Stay on this page' },
  discardBtn: { id: 'programs.bulk-trainee-results.unsaved-changes.discard-btn', defaultMessage: 'Discard and continue' },
  saveBtnDefault: { id: 'programs.bulk-trainee-results.unsaved-changes.save-btn.default', defaultMessage: 'Save and continue' },
  saveBtnPending: { id: 'programs.bulk-trainee-results.unsaved-changes.save-btn.pending', defaultMessage: 'Saving…' },
});

interface BulkResultsUnsavedChangesModalProps {
  isOpen: boolean;
  dirtyCount: number;
  isSaving: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveAndContinue: () => void;
}

const BulkResultsUnsavedChangesModal: React.FC<BulkResultsUnsavedChangesModalProps> = ({
  isOpen, dirtyCount, isSaving, onCancel, onDiscard, onSaveAndContinue,
}) => {
  const intl = useIntl();

  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen={isOpen}
      onClose={onCancel}
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p className="mb-0">{intl.formatMessage(messages.body, { count: dirtyCount })}</p>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="tertiary" onClick={onCancel} disabled={isSaving}>
            {intl.formatMessage(messages.cancelBtn)}
          </Button>
          <Button variant="danger-outline" onClick={onDiscard} disabled={isSaving}>
            {intl.formatMessage(messages.discardBtn)}
          </Button>
          <StatefulButton
            variant="primary"
            state={isSaving ? 'pending' : 'default'}
            disabledStates={['pending']}
            labels={{
              default: intl.formatMessage(messages.saveBtnDefault),
              pending: intl.formatMessage(messages.saveBtnPending),
            }}
            onClick={onSaveAndContinue}
          />
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default BulkResultsUnsavedChangesModal;
