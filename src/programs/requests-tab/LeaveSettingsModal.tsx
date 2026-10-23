import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Spinner, StandardModal, useToggle,
} from '@openedx/paragon';
import { Settings } from '@openedx/paragon/icons';
import ThresholdControl, { type ThresholdValue } from './ThresholdControl';
import { useLeaveThreshold, useUpdateLeaveThreshold } from './data/apiHooks';
import messages from './messages';

/**
 * Edits the program's leave threshold. Cancel and Save are always there; Save stays disabled
 * until a fresh threshold has loaded and the value differs from it.
 */
const LeaveSettingsDialog = ({ programKey, onClose }: { programKey: string; onClose: () => void }) => {
  const intl = useIntl();
  const { threshold: savedThreshold, isError: isLoadError } = useLeaveThreshold(programKey);
  const updateThreshold = useUpdateLeaveThreshold();
  const [draft, setDraft] = useState<ThresholdValue | null>(null);
  const value = draft ?? savedThreshold ?? '';
  const saving = updateThreshold.isPending;
  const canSave = savedThreshold !== null && !saving && value !== '' && value >= 0 && value !== savedThreshold;

  // Flags, at-risk counts and usage all derive from the threshold server-side; the hook refetches them.
  const handleSave = () => updateThreshold.mutate(
    { programKey, threshold: value as number },
    { onSuccess: onClose },
  );

  const renderBody = () => {
    if (isLoadError) {
      return <Alert variant="danger" className="mb-3">{intl.formatMessage(messages.leaveSettingsLoadError)}</Alert>;
    }
    if (savedThreshold === null) {
      return (
        <div className="text-center py-3">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.leaveSettingsLoading)} />
        </div>
      );
    }
    return <ThresholdControl value={value} onChange={setDraft} disabled={saving} />;
  };

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={intl.formatMessage(messages.leaveSettings)}
      size="md"
      isFullscreenOnMobile
      footerNode={(
        <>
          <Button variant="tertiary" onClick={onClose} disabled={saving}>{intl.formatMessage(messages.cancel)}</Button>
          <Button variant="primary" className="ml-2" onClick={handleSave} disabled={!canSave}>
            {saving && (
              <Spinner animation="border" size="sm" className="mr-1" screenReaderText={intl.formatMessage(messages.saving)} />
            )}
            {intl.formatMessage(messages.save)}
          </Button>
        </>
      )}
    >
      {updateThreshold.isError && (
        <Alert variant="danger" className="mb-3">{intl.formatMessage(messages.leaveSettingsSaveError)}</Alert>
      )}
      {renderBody()}
    </StandardModal>
  );
};

/** "Leave settings" button plus the modal that edits the program's leave threshold. */
const LeaveSettingsModal = ({ programKey }: { programKey: string }) => {
  const intl = useIntl();
  const [isOpen, open, close] = useToggle(false);
  return (
    <>
      <Button variant="outline-primary" size="sm" iconBefore={Settings} onClick={open}>
        {intl.formatMessage(messages.leaveSettings)}
      </Button>
      {isOpen && <LeaveSettingsDialog programKey={programKey} onClose={close} />}
    </>
  );
};

export default LeaveSettingsModal;
