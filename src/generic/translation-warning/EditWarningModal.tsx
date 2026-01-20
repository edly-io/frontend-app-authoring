import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ModalDialog,
  Button,
  ActionRow,
} from '@openedx/paragon';
import messages from './messages';
import type { EditWarningModalConfig } from './useEditWarningModal';

interface EditWarningModalProps {
  isOpen: boolean;
  config: EditWarningModalConfig | null;
  onClose: () => void;
}

/**
 * Reusable modal component for displaying edit warnings related to course translations
 */
const EditWarningModal: React.FC<EditWarningModalProps> = ({
  isOpen,
  config,
  onClose,
}) => {
  const intl = useIntl();

  if (!config) {
    return null;
  }

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      hasCloseButton
      isFullscreenOnMobile
      variant="warning"
      title={config.title}
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>
          {config.title}
        </ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p>{config.body}</p>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton
            variant="tertiary"
            onClick={onClose}
          >
            {intl.formatMessage(messages.cancelButton)}
          </ModalDialog.CloseButton>
          <Button onClick={config.onConfirm}>
            {intl.formatMessage(messages.continueEditingButton)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default EditWarningModal;

