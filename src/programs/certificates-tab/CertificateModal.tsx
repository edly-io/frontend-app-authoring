import React from 'react';
import {
  ActionRow,
  Button,
  ModalDialog,
  Spinner,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { CertificateHtmlView, PrintCertificateButton } from '@edly-io/frontend-component-fbr';
import type { CertificateConfig, CertificateRosterRow } from '../data/types';
import { useCertificatePreview } from '../data/apiHooks';

const messages = defineMessages({
  previewTitle: { id: 'programs.certificates.modal.preview', defaultMessage: 'Certificate preview' },
  awardedTitle: { id: 'programs.certificates.modal.awarded', defaultMessage: 'Awarded certificate' },
  print: { id: 'programs.certificates.modal.print', defaultMessage: 'Print / PDF' },
  award: { id: 'programs.certificates.modal.award', defaultMessage: 'Award certificate' },
  revoke: { id: 'programs.certificates.modal.revoke', defaultMessage: 'Revoke certificate' },
  close: { id: 'programs.certificates.modal.close', defaultMessage: 'Close' },
});

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
      title={intl.formatMessage(isAwarded ? messages.awardedTitle : messages.previewTitle)}
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
          {intl.formatMessage(isAwarded ? messages.awardedTitle : messages.previewTitle)}
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
            {intl.formatMessage(messages.close)}
          </Button>
          <ActionRow.Spacer />
          <PrintCertificateButton
            html={html ?? ''}
            traineeName={row.fullName}
            programName={programName}
            label={intl.formatMessage(messages.print)}
          />
          {award ? (
            <Button variant="danger" onClick={() => onRevoke(award.certificateNumber)} disabled={isRevoking}>
              {isRevoking ? (
                <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.revoke)} />
              ) : intl.formatMessage(messages.revoke)}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => onAward(row.username)} disabled={isAwarding}>
              {isAwarding ? (
                <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.award)} />
              ) : intl.formatMessage(messages.award)}
            </Button>
          )}
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default CertificateModal;
