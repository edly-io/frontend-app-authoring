import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useToggle } from '@openedx/paragon';
import messages from './messages';

export interface EditWarningModalConfig {
  title: string;
  body: string;
  onConfirm: () => void;
}

export type WarningType = 'TRANSLATED' | 'BASE' | null;

/**
 * Custom hook to manage edit warning modal state and determine which warning to show
 * based on course translation status
 */
export const useEditWarningModal = () => {
  const intl = useIntl();
  const [isConfirmModalOpen, openConfirmModal, closeConfirmModal] = useToggle(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<EditWarningModalConfig | null>(null);

  /**
   * Determines the warning type based on translation status and destination block flag
   */
  const determineWarningType = (
    isTranslatedOrBaseCourse: string | null | undefined,
    isDestinationBlock: boolean = false,
  ): WarningType => {
    const courseType = isTranslatedOrBaseCourse?.toUpperCase();
    
    if (courseType === 'TRANSLATED' && isDestinationBlock) {
      return 'TRANSLATED';
    }
    
    if (courseType === 'BASE') {
      return 'BASE';
    }
    
    return null;
  };

  /**
   * Opens the warning modal with the appropriate message
   */
  const showWarningModal = (warningType: WarningType, onConfirm: () => void) => {
    if (warningType === 'TRANSLATED') {
      setConfirmModalConfig({
        title: intl.formatMessage(messages.editTranslatedRerunTitle),
        body: intl.formatMessage(messages.editTranslatedRerunBody),
        onConfirm: () => {
          closeConfirmModal();
          setConfirmModalConfig(null);
          onConfirm();
        },
      });
      openConfirmModal();
    } else if (warningType === 'BASE') {
      setConfirmModalConfig({
        title: intl.formatMessage(messages.editBaseCourseTitle),
        body: intl.formatMessage(messages.editBaseCourseBody),
        onConfirm: () => {
          closeConfirmModal();
          setConfirmModalConfig(null);
          onConfirm();
        },
      });
      openConfirmModal();
    }
  };

  /**
   * Closes the modal and resets the configuration
   */
  const handleCloseModal = (onCancel?: () => void) => {
    closeConfirmModal();
    setConfirmModalConfig(null);
    if (onCancel) {
      onCancel();
    }
  };

  return {
    isConfirmModalOpen,
    confirmModalConfig,
    determineWarningType,
    showWarningModal,
    handleCloseModal,
  };
};

