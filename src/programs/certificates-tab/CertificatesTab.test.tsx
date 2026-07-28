import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import CertificatesTab from './CertificatesTab';
import type { CertificateRosterRow } from '../data/types';

const mockAwardMutate = jest.fn();
const mockRevokeMutate = jest.fn();
const mockUpdateConfigMutate = jest.fn();
const mockUploadSignatureMutateAsync = jest.fn();
const mockUseCertificateRoster = jest.fn();
const mockUseCertificateConfig = jest.fn();
const mockUseAwardCertificates = jest.fn();
const mockUseRevokeCertificate = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useCertificateRoster: (...args: any[]) => mockUseCertificateRoster(...args),
  useCertificateConfig: (...args: any[]) => mockUseCertificateConfig(...args),
  useAwardCertificates: () => mockUseAwardCertificates(),
  useRevokeCertificate: () => mockUseRevokeCertificate(),
  useUpdateCertificateConfig: () => ({ mutate: mockUpdateConfigMutate, isPending: false }),
  useUploadCertificateSignature: () => ({ mutateAsync: mockUploadSignatureMutateAsync, isPending: false }),
}));

const programId = 'prog-key-1';
const programName = 'Specialised Training Programme';

const awardedRow: CertificateRosterRow = {
  username: 'ayesha.tariq',
  fullName: 'Ayesha Tariq',
  avatarUrl: null,
  percent: '94.0',
  result: 'pass',
  status: 'finalized',
  certificate: { certificateNumber: 'FBR-CERT-AYESHA', status: 'active', issuedAt: '2026-06-18T00:00:00Z' },
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

const renderTab = () => render(
  <CertificatesTab programId={programId} programName={programName} isActive />,
);

describe('<CertificatesTab />', () => {
  beforeEach(() => {
    initializeMocks();
    mockAwardMutate.mockImplementation((usernames: string[], opts?: any) => {
      opts?.onSuccess?.({ ok: usernames, errors: [] });
      opts?.onSettled?.();
    });
    mockRevokeMutate.mockImplementation((_num: string, opts?: any) => {
      opts?.onSuccess?.();
      opts?.onSettled?.();
    });
    mockUseAwardCertificates.mockReturnValue({ mutate: mockAwardMutate, isPending: false, variables: undefined });
    mockUseRevokeCertificate.mockReturnValue({ mutate: mockRevokeMutate, isPending: false, variables: undefined });
    mockUseCertificateRoster.mockReturnValue({ data: [awardedRow, pendingRow], isLoading: false, isError: false });
    mockUseCertificateConfig.mockReturnValue({
      data: { issuedBy: 'Directorate of Training', signatories: [{ name: 'A. Director', title: 'DG' }] },
    });
  });

  it('renders every roster row with its score', () => {
    renderTab();
    expect(screen.getByText('Ayesha Tariq')).toBeInTheDocument();
    expect(screen.getByText('Jawad Ali')).toBeInTheDocument();
    expect(screen.getByText('94.0%')).toBeInTheDocument();
  });

  it('shows awarded status with the issuance date', () => {
    renderTab();
    // "Awarded" also appears as a filter option, so assert on the unique date.
    const meta = screen.getByText('18 Jun 2026');
    expect(meta).toBeInTheDocument();
    expect(meta.closest('td')).toHaveTextContent('Awarded');
  });

  it('awards a certificate to a pending trainee', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /^Award$/i }));
    expect(mockAwardMutate.mock.calls[0][0]).toEqual(['jawad.ali']);
  });

  it('revokes an awarded certificate', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /^Revoke$/i }));
    expect(mockRevokeMutate.mock.calls[0][0]).toBe('FBR-CERT-AYESHA');
  });

  it('spins the row award button, not the bulk button, for a single-row award', () => {
    mockUseAwardCertificates.mockReturnValue({ mutate: mockAwardMutate, isPending: true, variables: undefined });
    mockAwardMutate.mockImplementationOnce(() => {}); // leave the award pending, no onSettled
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /^Award$/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('spins the bulk award button, not the row button, for a bulk award', () => {
    // The bulk button is disabled while isPending is true, so it must start
    // false and flip only once mutate() actually fires — mirroring how
    // react-query flips isPending as a side effect of calling mutate.
    let isPending = false;
    mockUseAwardCertificates.mockImplementation(() => ({
      mutate: mockAwardMutate, isPending, variables: undefined,
    }));
    mockAwardMutate.mockImplementationOnce(() => { isPending = true; }); // left pending, no onSettled
    renderTab();
    fireEvent.click(screen.getByRole('checkbox', { name: /Select Jawad Ali/i }));
    fireEvent.click(screen.getByRole('button', { name: /Award selected/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    // The row's own Award button is untouched by the bulk action's pending state.
    expect(screen.getByRole('button', { name: /^Award$/i })).not.toBeDisabled();
  });

  it('shows a spinner on the revoke button while revoking', () => {
    mockUseRevokeCertificate.mockReturnValue({
      mutate: mockRevokeMutate, isPending: true, variables: 'FBR-CERT-AYESHA',
    });
    renderTab();
    expect(screen.getByRole('button', { name: /^Revoke$/i })).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('filters the roster by search query', () => {
    renderTab();
    fireEvent.change(screen.getByPlaceholderText(/Search trainees/i), { target: { value: 'jawad' } });
    expect(screen.queryByText('Ayesha Tariq')).not.toBeInTheDocument();
    expect(screen.getByText('Jawad Ali')).toBeInTheDocument();
  });

  it('shows the empty state when no rows match', () => {
    renderTab();
    fireEvent.change(screen.getByPlaceholderText(/Search trainees/i), { target: { value: 'nobody' } });
    expect(screen.getByText(/No trainees match your filters/i)).toBeInTheDocument();
  });

  it('renders the certificate settings panel with the issuing authority', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('tab', { name: /Configuration/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Directorate of Training')).toBeInTheDocument();
    });
  });
});
