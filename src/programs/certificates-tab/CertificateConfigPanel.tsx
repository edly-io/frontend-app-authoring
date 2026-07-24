import React, { useContext, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  IconButton,
  Spinner,
} from '@openedx/paragon';
import { Add, DeleteOutline } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import type { Signatory } from '../data/types';
import { useCertificateConfig, useUpdateCertificateConfig } from '../data/apiHooks';
import CertificatePreview from './CertificatePreview';

const messages = defineMessages({
  heading: { id: 'programs.certificates.config.heading', defaultMessage: 'Certificate settings' },
  subheading: {
    id: 'programs.certificates.config.subheading',
    defaultMessage: 'Set the issuing authority and signatories. The template layout is fixed for all programs.',
  },
  issuedByLabel: { id: 'programs.certificates.config.issuedBy', defaultMessage: 'Issued by' },
  issuedByHelp: {
    id: 'programs.certificates.config.issuedBy.help',
    defaultMessage: 'The issuing authority printed on the certificate.',
  },
  issuedByPlaceholder: {
    id: 'programs.certificates.config.issuedBy.placeholder',
    defaultMessage: 'e.g. Directorate of Training (Direct Taxes), FBR',
  },
  signatoriesLabel: { id: 'programs.certificates.config.signatories', defaultMessage: 'Signatories' },
  signatoryName: { id: 'programs.certificates.config.signatory.name', defaultMessage: 'Full name' },
  signatoryTitle: { id: 'programs.certificates.config.signatory.title', defaultMessage: 'Designation' },
  removeSignatory: { id: 'programs.certificates.config.signatory.remove', defaultMessage: 'Remove signatory' },
  addSignatory: { id: 'programs.certificates.config.signatory.add', defaultMessage: 'Add signatory' },
  save: { id: 'programs.certificates.config.save', defaultMessage: 'Save settings' },
  saving: { id: 'programs.certificates.config.saving', defaultMessage: 'Saving…' },
  saved: { id: 'programs.certificates.config.saved', defaultMessage: 'Certificate settings saved.' },
  saveError: {
    id: 'programs.certificates.config.save.error',
    defaultMessage: 'Could not save certificate settings. Please try again.',
  },
  previewTitle: { id: 'programs.certificates.config.preview.title', defaultMessage: 'Live preview' },
  previewHint: {
    id: 'programs.certificates.config.preview.hint',
    defaultMessage: "Sample name shown — each trainee's real name is used on their certificate.",
  },
});

const PREVIEW_TRAINEE_NAME = 'Trainee Name';
const PREVIEW_CERTIFICATE_NUMBER = 'FBR-CERT-XXXXXX';

interface CertificateConfigPanelProps {
  programId: string;
  programName: string;
}

const CertificateConfigPanel: React.FC<CertificateConfigPanelProps> = ({ programId, programName }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const { data: savedConfig, isLoading } = useCertificateConfig(programId);
  const updateConfig = useUpdateCertificateConfig(programId);

  const [issuedBy, setIssuedBy] = useState('');
  const [signatories, setSignatories] = useState<Signatory[]>([]);

  // Seed the editable form once the saved config arrives.
  useEffect(() => {
    if (savedConfig) {
      setIssuedBy(savedConfig.issuedBy);
      setSignatories(savedConfig.signatories.map((s) => ({ ...s })));
    }
  }, [savedConfig]);

  const updateSignatory = (index: number, field: keyof Signatory, value: string) => {
    setSignatories((current) => current.map(
      (signatory, i) => (i === index ? { ...signatory, [field]: value } : signatory),
    ));
  };

  const addSignatory = () => setSignatories((current) => [...current, { name: '', title: '' }]);

  const removeSignatory = (index: number) => setSignatories(
    (current) => current.filter((_, i) => i !== index),
  );

  const handleSave = () => {
    updateConfig.mutate(
      { issuedBy, signatories },
      {
        onSuccess: () => showToast(intl.formatMessage(messages.saved)),
        onError: () => showToast(intl.formatMessage(messages.saveError)),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" screenReaderText={intl.formatMessage(messages.saving)} />
      </div>
    );
  }

  return (
    <div className="certificate-config-grid">
      <Card>
        <Card.Header
          title={intl.formatMessage(messages.heading)}
          subtitle={intl.formatMessage(messages.subheading)}
        />
        <Card.Section>
          <Form.Group>
            <Form.Label>{intl.formatMessage(messages.issuedByLabel)}</Form.Label>
            <Form.Control
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder={intl.formatMessage(messages.issuedByPlaceholder)}
            />
            <Form.Text>{intl.formatMessage(messages.issuedByHelp)}</Form.Text>
          </Form.Group>

          <Form.Label className="mt-3">{intl.formatMessage(messages.signatoriesLabel)}</Form.Label>
          {signatories.map((signatory, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="certificate-signatory-row" key={index}>
              <Form.Control
                value={signatory.name}
                onChange={(e) => updateSignatory(index, 'name', e.target.value)}
                placeholder={intl.formatMessage(messages.signatoryName)}
                aria-label={intl.formatMessage(messages.signatoryName)}
              />
              <Form.Control
                value={signatory.title}
                onChange={(e) => updateSignatory(index, 'title', e.target.value)}
                placeholder={intl.formatMessage(messages.signatoryTitle)}
                aria-label={intl.formatMessage(messages.signatoryTitle)}
              />
              <IconButton
                src={DeleteOutline}
                alt={intl.formatMessage(messages.removeSignatory)}
                onClick={() => removeSignatory(index)}
                variant="danger"
              />
            </div>
          ))}
          <Button variant="tertiary" size="sm" iconBefore={Add} onClick={addSignatory}>
            {intl.formatMessage(messages.addSignatory)}
          </Button>
        </Card.Section>
        <Card.Footer>
          <Button
            onClick={handleSave}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending
              ? intl.formatMessage(messages.saving)
              : intl.formatMessage(messages.save)}
          </Button>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Header title={intl.formatMessage(messages.previewTitle)} />
        <Card.Section>
          <CertificatePreview
            variant="mini"
            config={{ issuedBy, signatories }}
            programName={programName}
            traineeName={PREVIEW_TRAINEE_NAME}
            certificateNumber={PREVIEW_CERTIFICATE_NUMBER}
            issuedAt={new Date().toISOString()}
          />
          <p className="certificate-preview-hint">{intl.formatMessage(messages.previewHint)}</p>
        </Card.Section>
      </Card>
    </div>
  );
};

export default CertificateConfigPanel;
