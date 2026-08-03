import React from 'react';
import {
  ActionRow,
  Button,
  ModalDialog,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { CertificateHtmlView, PrintCertificateButton } from '@edly-io/frontend-component-fbr';
import type { CertificateConfig, CertificateRosterRow } from '../data/types';
import { useCertificatePreview } from '../data/apiHooks';
import SpinnerButton from './SpinnerButton';
import messages from './messages';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: CertificateRosterRow | null;
  programId: string;
  config: CertificateConfig;
  programName: string;
  onAward: (username: string) => void;
  onRevoke: (certificateNumber: string) => void;
  isAwarding: boolean;
  isRevoking: boolean;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  row,
  programId,
  config,
  programName,
  onAward,
  onRevoke,
  isAwarding,
  isRevoking,
}) => {
  const intl = useIntl();

  const award = row?.certificate ?? null;
  // Real issue date for an awarded cert; omit for a not-yet-issued preview so
  // the backend defaults to today (and the query key stays stable per render).
  const { data: html } = useCertificatePreview(
    programId,
    { config, traineeName: row?.fullName ?? '', issuedAt: award?.issuedAt },
    isOpen && !!row,
  );

  if (!row) {
    return null;
  }

  const isAwarded = !!award;

  return (
    <ModalDialog
      title={intl.formatMessage(isAwarded ? messages.modalAwardedTitle : messages.modalPreviewTitle)}
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="certificate-preview-modal"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>
          {intl.formatMessage(isAwarded ? messages.modalAwardedTitle : messages.modalPreviewTitle)}
        </ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        {/* On-screen preview: sized to fit the modal without scrolling. */}
        <div className="fbr-cert-modal-view">
          <CertificateHtmlView html={html ?? ''} mode="fit" />
        </div>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="tertiary" onClick={onClose}>
            {intl.formatMessage(messages.modalClose)}
          </Button>
          <ActionRow.Spacer />
          <PrintCertificateButton
            html={html ?? ''}
            traineeName={row.fullName}
            programName={programName}
            label={intl.formatMessage(messages.modalPrint)}
          />
          {award ? (
            <SpinnerButton
              variant="danger"
              label={intl.formatMessage(messages.modalRevoke)}
              onClick={() => onRevoke(award.certificateNumber)}
              isPending={isRevoking}
              disabled={isRevoking}
            />
          ) : (
            <SpinnerButton
              variant="primary"
              label={intl.formatMessage(messages.modalAward)}
              onClick={() => onAward(row.username)}
              isPending={isAwarding}
              disabled={isAwarding}
            />
          )}
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default CertificateModal;
