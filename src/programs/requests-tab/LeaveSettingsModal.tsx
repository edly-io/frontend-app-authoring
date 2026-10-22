import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Spinner, StandardModal, useToggle,
} from '@openedx/paragon';
import { Settings } from '@openedx/paragon/icons';
import { useProgram } from '@edly-io/frontend-component-fbr';
import ThresholdControl, { type ThresholdValue } from './ThresholdControl';
import { useUpdateLeaveThreshold } from './data/apiHooks';
import messages from './messages';

interface LeaveSettingsFormProps {
  programKey: string;
  savedThreshold: number;
  onClose: () => void;
}

const LeaveSettingsForm = ({ programKey, savedThreshold, onClose }: LeaveSettingsFormProps) => {
  const intl = useIntl();
  const [value, setValue] = useState<ThresholdValue>(savedThreshold);
  const updateThreshold = useUpdateLeaveThreshold();
  const saving = updateThreshold.isPending;
  const canSave = !saving && value !== '' && value >= 0 && value !== savedThreshold;

  // Flags, at-risk counts and usage all derive from the threshold server-side; the hook refetches them.
  const handleSave = () => updateThreshold.mutate(
    { programKey, threshold: value as number },
    { onSuccess: onClose },
  );

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
      <ThresholdControl value={value} onChange={setValue} disabled={saving} />
    </StandardModal>
  );
};

/** Loads the program's threshold only once the modal opens. */
const LeaveSettingsDialog = ({ programKey, onClose }: { programKey: string; onClose: () => void }) => {
  const intl = useIntl();
  const programQuery = useProgram(programKey);
  if (programQuery.isSuccess) {
    const threshold = Number(programQuery.data?.threshold ?? 0);
    return <LeaveSettingsForm programKey={programKey} savedThreshold={threshold} onClose={onClose} />;
  }
  return (
    <StandardModal isOpen onClose={onClose} title={intl.formatMessage(messages.leaveSettings)} size="md" isFullscreenOnMobile>
      {programQuery.isError ? (
        <Alert variant="danger" className="mb-3">{intl.formatMessage(messages.leaveSettingsLoadError)}</Alert>
      ) : (
        <div className="text-center py-3">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.leaveSettingsLoading)} />
        </div>
      )}
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
