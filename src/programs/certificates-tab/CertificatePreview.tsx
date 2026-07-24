import React from 'react';
import type { CertificateConfig } from '../data/types';

interface CertificatePreviewProps {
  config: CertificateConfig;
  programName: string;
  traineeName: string;
  certificateNumber: string;
  issuedAt: string;
  /** 'mini' is used for the settings live-preview; 'full' for the print modal. */
  variant?: 'mini' | 'full';
}

const formatIssueDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * The certificate document. Pure presentational — every value is passed in, so
 * the same component renders the settings preview, an award preview, and an
 * issued certificate. Presentation is always live (never snapshotted).
 */
const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  config,
  programName,
  traineeName,
  certificateNumber,
  issuedAt,
  variant = 'full',
}) => {
  const signatories = config.signatories.filter((s) => s.name || s.title);

  return (
    <div className={`fbr-cert${variant === 'mini' ? ' fbr-cert--mini' : ''}`}>
      <div className="fbr-cert__frame" />
      <div className="fbr-cert__inner">
        <div className="fbr-cert__mark">FBR</div>
        <div className="fbr-cert__org">Federal Board of Revenue</div>
        <div className="fbr-cert__gov">Government of Pakistan</div>
        <div className="fbr-cert__title">Certificate of Completion</div>
        <div className="fbr-cert__subtitle">{programName}</div>
        <div className="fbr-cert__present">This is proudly presented to</div>
        <div className="fbr-cert__name">{traineeName}</div>
        <div className="fbr-cert__body">
          for the successful completion of the <b>{programName}</b>, having met all
          requirements of the prescribed evaluation scheme.
          {config.issuedBy ? (
            <>
              {' '}Issued by <b>{config.issuedBy}</b>.
            </>
          ) : null}
        </div>
        <div className="fbr-cert__sigs">
          {signatories.map((signatory) => (
            <div className="fbr-cert__sig" key={`${signatory.name}-${signatory.title}`}>
              <div className="fbr-cert__sig-line" />
              <div className="fbr-cert__sig-name">{signatory.name || '—'}</div>
              <div className="fbr-cert__sig-title">{signatory.title}</div>
            </div>
          ))}
        </div>
        <div className="fbr-cert__seal">FBR<br />SEAL</div>
      </div>
      <div className="fbr-cert__meta">
        Certificate No: {certificateNumber}
        <br />
        Date of issue: {formatIssueDate(issuedAt)}
      </div>
    </div>
  );
};

export default CertificatePreview;
