import { useIntl } from '@edx/frontend-platform/i18n';
import { ActionRow, Button, ModalDialog } from '@openedx/paragon';

import messages from './messages';

interface ConfirmNavigationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmNavigationModal = ({ isOpen, onConfirm, onCancel }: ConfirmNavigationModalProps) => {
  const intl = useIntl();
  return (
    <ModalDialog
      title={intl.formatMessage(messages.unsavedTitle)}
      isOpen={isOpen}
      onClose={onCancel}
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.unsavedTitle)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p>{intl.formatMessage(messages.unsavedBody)}</p>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="tertiary" onClick={onCancel}>{intl.formatMessage(messages.keepEditing)}</Button>
          <Button variant="danger" onClick={onConfirm}>{intl.formatMessage(messages.discardChanges)}</Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default ConfirmNavigationModal;
