import React, {
  useContext, useEffect, useRef, useState,
} from 'react';
import {
  Button,
  Card,
  Form,
  IconButton,
  Spinner,
} from '@openedx/paragon';
import {
  Add, Close, CloudUpload, DeleteOutline,
} from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { ToastContext } from '../../generic/toast-context';
import type { Signatory } from '../data/types';
import {
  useCertificateConfig,
  useUpdateCertificateConfig,
  useUploadCertificateSignature,
} from '../data/apiHooks';
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
  signatoriesHint: {
    id: 'programs.certificates.config.signatories.hint',
    defaultMessage: 'Up to 3 signatories, shown in a single row on the certificate.',
  },
  signatoryName: { id: 'programs.certificates.config.signatory.name', defaultMessage: 'Full name' },
  signatoryTitle: { id: 'programs.certificates.config.signatory.title', defaultMessage: 'Designation' },
  signatureUpload: { id: 'programs.certificates.config.signatory.signature', defaultMessage: 'Upload signature' },
  signatureReplace: { id: 'programs.certificates.config.signatory.signature.replace', defaultMessage: 'Replace' },
  signatureFormatHint: {
    id: 'programs.certificates.config.signatory.signature.hint',
    defaultMessage: 'Image must be in PNG format.',
  },
  signatureFormatError: {
    id: 'programs.certificates.config.signatory.signature.error',
    defaultMessage: 'Image must be in PNG format.',
  },
  signatureSizeError: {
    id: 'programs.certificates.config.signatory.signature.size.error',
    defaultMessage: 'Image must be under {maxKb} KB.',
  },
  signatureUploadError: {
    id: 'programs.certificates.config.signatory.signature.upload.error',
    defaultMessage: 'Could not upload signature. Please try again.',
  },
  signatureUploading: {
    id: 'programs.certificates.config.signatory.signature.uploading',
    defaultMessage: 'Uploading…',
  },
  signatureRemove: { id: 'programs.certificates.config.signatory.signature.remove', defaultMessage: 'Remove signature' },
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
const MAX_SIGNATORIES = 3;
// Must match fbr.cms.program_certificates.models.MAX_SIGNATURE_IMAGE_BYTES —
// checked client-side too so oversized files fail fast, before a network call.
const MAX_SIGNATURE_BYTES = 300 * 1024;

interface CertificateConfigPanelProps {
  programId: string;
  programName: string;
}

const CertificateConfigPanel: React.FC<CertificateConfigPanelProps> = ({ programId, programName }) => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const { data: savedConfig, isLoading } = useCertificateConfig(programId);
  const updateConfig = useUpdateCertificateConfig(programId);
  const uploadSignature = useUploadCertificateSignature(programId);

  const [issuedBy, setIssuedBy] = useState('');
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  // Row index currently mid-upload, so its button can show a spinner and the
  // file input can be disabled — uploads are sequential, one row at a time.
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Hidden <input type="file"> refs, one per signatory row, so the upload
  // button can trigger the native picker without a visible input.
  const signatureFileInputs = useRef<Array<HTMLInputElement | null>>([]);

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

  const addSignatory = () => setSignatories(
    (current) => (current.length >= MAX_SIGNATORIES
      ? current
      : [...current, { name: '', title: '' }]),
  );

  const removeSignatory = (index: number) => setSignatories(
    (current) => current.filter((_, i) => i !== index),
  );

  const setSignatoryImage = (index: number, signatureAssetId: number | null, signatureUrl: string) => {
    setSignatories((current) => current.map(
      (signatory, i) => (i === index ? { ...signatory, signatureAssetId, signatureUrl } : signatory),
    ));
  };

  const handleSignatureUpload = async (index: number, file: File | null) => {
    if (!file) { return; }
    // PNG only: the signature composites over a tinted paper background and a
    // dashed line, so transparency matters; PNG is also lossless for print.
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    if (!isPng) {
      showToast(intl.formatMessage(messages.signatureFormatError));
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      showToast(intl.formatMessage(messages.signatureSizeError, { maxKb: MAX_SIGNATURE_BYTES / 1024 }));
      return;
    }
    setUploadingIndex(index);
    try {
      const { id, url } = await uploadSignature.mutateAsync(file);
      setSignatoryImage(index, id, url);
    } catch {
      showToast(intl.formatMessage(messages.signatureUploadError));
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeSignature = (index: number) => setSignatoryImage(index, null, '');

  const renderSignatureControl = (signatory: Signatory, index: number) => {
    if (uploadingIndex === index) {
      return (
        <Button variant="outline-primary" size="sm" disabled>
          <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.signatureUploading)} />
          {' '}
          {intl.formatMessage(messages.signatureUploading)}
        </Button>
      );
    }
    if (signatory.signatureUrl) {
      return (
        <>
          <img
            className="certificate-signatory-signature__thumb"
            src={signatory.signatureUrl}
            alt={intl.formatMessage(messages.signatureUpload)}
          />
          <div className="certificate-signatory-signature__actions">
            <Button
              variant="tertiary"
              size="sm"
              iconBefore={CloudUpload}
              onClick={() => signatureFileInputs.current[index]?.click()}
            >
              {intl.formatMessage(messages.signatureReplace)}
            </Button>
            <IconButton
              src={Close}
              alt={intl.formatMessage(messages.signatureRemove)}
              onClick={() => removeSignature(index)}
              size="sm"
            />
          </div>
        </>
      );
    }
    return (
      <Button
        variant="outline-primary"
        size="sm"
        iconBefore={CloudUpload}
        onClick={() => signatureFileInputs.current[index]?.click()}
      >
        {intl.formatMessage(messages.signatureUpload)}
      </Button>
    );
  };

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
          <Form.Text className="certificate-signatories-hint">
            {intl.formatMessage(messages.signatoriesHint)}
          </Form.Text>
          {signatories.map((signatory, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="certificate-signatory-row" key={index}>
              <div className="certificate-signatory-fields">
                <div className="certificate-signatory-fields__inputs">
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
                </div>
                <IconButton
                  src={DeleteOutline}
                  alt={intl.formatMessage(messages.removeSignatory)}
                  onClick={() => removeSignatory(index)}
                  variant="danger"
                />
              </div>
              <div className="certificate-signatory-signature">
                {renderSignatureControl(signatory, index)}
                <span className="certificate-signatory-signature__hint">
                  {intl.formatMessage(messages.signatureFormatHint)}
                </span>
                <input
                  ref={(el) => {
                    signatureFileInputs.current[index] = el;
                  }}
                  type="file"
                  accept="image/png"
                  className="certificate-signatory-signature__input"
                  disabled={uploadingIndex !== null}
                  onChange={(e) => {
                    handleSignatureUpload(index, e.target.files?.[0] ?? null);
                    // Reset so choosing the same file again still fires onChange.
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          ))}
          {signatories.length < MAX_SIGNATORIES && (
            <Button variant="tertiary" size="sm" iconBefore={Add} onClick={addSignatory} className="mt-2">
              {intl.formatMessage(messages.addSignatory)}
            </Button>
          )}
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
            config={{ issuedBy, signatories }}
            programName={programName}
            traineeName={PREVIEW_TRAINEE_NAME}
            issuedAt={new Date().toISOString()}
          />
          <p className="certificate-preview-hint">{intl.formatMessage(messages.previewHint)}</p>
        </Card.Section>
      </Card>
    </div>
  );
};

export default CertificateConfigPanel;
