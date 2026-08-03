import type React from 'react';
import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import CertificateModal from './CertificateModal';
import type { CertificateConfig, CertificateRosterRow } from '../data/types';

jest.mock('@src/programs/data/apiHooks', () => ({
  useCertificatePreview: () => ({ data: '<div class="fbr-cert" />', isFetching: false }),
}));

const mockPrint = jest.fn();
jest.mock('@edly-io/frontend-component-fbr', () => ({
  __esModule: true,
  CertificateHtmlView: () => null,
  PrintCertificateButton: (props: {
    html: string; traineeName: string; programName: string; label?: string;
  }) => (
    <button
      type="button"
      data-testid="print-cert-btn"
      data-html={props.html}
      data-trainee={props.traineeName}
      data-program={props.programName}
      onClick={() => mockPrint(props.html, props.traineeName, props.programName)}
    >
      {props.label}
    </button>
  ),
}));

const config: CertificateConfig = {
  issuedBy: 'Directorate of Training',
  signatories: [{ name: 'A. Director', title: 'DG' }],
};

const pendingRow: CertificateRosterRow = {
  username: 'jawad.ali',
  fullName: 'Jawad Ali',
  avatarUrl: null,
  percent: '55.0',
  result: 'pass',
  status: 'finalized',
  certificate: null,
};

const awardedRow: CertificateRosterRow = {
  ...pendingRow,
  username: 'ayesha.tariq',
  fullName: 'Ayesha Tariq',
  certificate: { certificateNumber: 'FBR-CERT-AYESHA', status: 'active', issuedAt: '2026-06-18T00:00:00Z' },
};

const noop = () => {};

const renderModal = (overrides: Partial<React.ComponentProps<typeof CertificateModal>> = {}) => render(
  <CertificateModal
    isOpen
    onClose={noop}
    row={pendingRow}
    programId="prog-key-1"
    config={config}
    programName="Specialised Training Programme"
    onAward={noop}
    onRevoke={noop}
    isAwarding={false}
    isRevoking={false}
    {...overrides}
  />,
);

describe('<CertificateModal />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders nothing when there is no row', () => {
    renderModal({ row: null });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an Award certificate action for a not-yet-awarded row', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /^Award certificate$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Revoke certificate$/i })).not.toBeInTheDocument();
  });

  it('shows a Revoke certificate action for an awarded row', () => {
    renderModal({ row: awardedRow });
    expect(screen.getByRole('button', { name: /^Revoke certificate$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Award certificate$/i })).not.toBeInTheDocument();
  });

  it('calls onAward with the row username', () => {
    const onAward = jest.fn();
    renderModal({ onAward });
    fireEvent.click(screen.getByRole('button', { name: /^Award certificate$/i }));
    expect(onAward).toHaveBeenCalledWith('jawad.ali');
  });

  it('calls onRevoke with the certificate number', () => {
    const onRevoke = jest.fn();
    renderModal({ row: awardedRow, onRevoke });
    fireEvent.click(screen.getByRole('button', { name: /^Revoke certificate$/i }));
    expect(onRevoke).toHaveBeenCalledWith('FBR-CERT-AYESHA');
  });

  it('calls onClose when the footer Close button is clicked', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    // Two controls are named "Close" — the dialog's built-in X and the footer
    // button; target the footer Button (not the pgn__modal-close-button icon).
    const footerClose = screen
      .getAllByRole('button', { name: /^Close$/i })
      .find((button) => !button.className.includes('pgn__modal-close-button'));
    fireEvent.click(footerClose as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the award action and shows a spinner while awarding', () => {
    renderModal({ isAwarding: true });
    expect(screen.getByRole('button', { name: /^Award certificate$/i })).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the shared print button with the certificate html and names', () => {
    renderModal();
    const btn = screen.getByTestId('print-cert-btn');
    expect(btn).toHaveAttribute('data-html', '<div class="fbr-cert" />');
    expect(btn).toHaveAttribute('data-trainee', 'Jawad Ali');
    expect(btn).toHaveAttribute('data-program', 'Specialised Training Programme');
    expect(btn).toHaveTextContent('Print / PDF');
  });
});
