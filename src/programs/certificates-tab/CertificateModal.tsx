import React from 'react';
import {
  ActionRow,
  Button,
  ModalDialog,
} from '@openedx/paragon';
import { Print } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { CertificateConfig, CertificateRosterRow } from '../data/types';
import CertificatePreview from './CertificatePreview';

const messages = defineMessages({
  previewTitle: { id: 'programs.certificates.modal.preview', defaultMessage: 'Certificate preview' },
  awardedTitle: { id: 'programs.certificates.modal.awarded', defaultMessage: 'Awarded certificate' },
  print: { id: 'programs.certificates.modal.print', defaultMessage: 'Print / PDF' },
  award: { id: 'programs.certificates.modal.award', defaultMessage: 'Award certificate' },
  revoke: { id: 'programs.certificates.modal.revoke', defaultMessage: 'Revoke certificate' },
  close: { id: 'programs.certificates.modal.close', defaultMessage: 'Close' },
});

const PENDING_CERTIFICATE_NUMBER = 'FBR-CERT-XXXXXX';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: CertificateRosterRow | null;
  config: CertificateConfig;
  programName: string;
  onAward: (username: string) => void;
  onRevoke: (certificateNumber: string) => void;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  row,
  config,
  programName,
  onAward,
  onRevoke,
}) => {
  const intl = useIntl();

  if (!row) {
    return null;
  }

  const award = row.certificate;
  const isAwarded = !!award;

  return (
    <ModalDialog
      title={intl.formatMessage(isAwarded ? messages.awardedTitle : messages.previewTitle)}
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
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
        <div className="fbr-cert-print-area">
          <CertificatePreview
            variant="full"
            config={config}
            programName={programName}
            traineeName={row.fullName}
            certificateNumber={award ? award.certificateNumber : PENDING_CERTIFICATE_NUMBER}
            issuedAt={award ? award.issuedAt : new Date().toISOString()}
          />
        </div>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="tertiary" onClick={onClose}>
            {intl.formatMessage(messages.close)}
          </Button>
          <ActionRow.Spacer />
          <Button variant="outline-primary" iconBefore={Print} onClick={() => window.print()}>
            {intl.formatMessage(messages.print)}
          </Button>
          {isAwarded ? (
            <Button variant="danger" onClick={() => onRevoke(award!.certificateNumber)}>
              {intl.formatMessage(messages.revoke)}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => onAward(row.username)}>
              {intl.formatMessage(messages.award)}
            </Button>
          )}
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default CertificateModal;
