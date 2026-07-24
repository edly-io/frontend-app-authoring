import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import CertificatesTab from './CertificatesTab';
import type { CertificateRosterRow } from '../data/types';

const mockAwardMutate = jest.fn();
const mockRevokeMutate = jest.fn();
const mockUpdateConfigMutate = jest.fn();
const mockUseCertificateRoster = jest.fn();
const mockUseCertificateConfig = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useCertificateRoster: (...args: any[]) => mockUseCertificateRoster(...args),
  useCertificateConfig: (...args: any[]) => mockUseCertificateConfig(...args),
  useAwardCertificates: () => ({ mutate: mockAwardMutate, isPending: false }),
  useRevokeCertificate: () => ({ mutate: mockRevokeMutate, isPending: false }),
  useUpdateCertificateConfig: () => ({ mutate: mockUpdateConfigMutate, isPending: false }),
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
    mockAwardMutate.mockImplementation((usernames: string[], opts?: any) => (
      opts?.onSuccess?.({ ok: usernames, errors: [] })
    ));
    mockRevokeMutate.mockImplementation((_num: string, opts?: any) => opts?.onSuccess?.());
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

  it('shows awarded status with the certificate number', () => {
    renderTab();
    // "Awarded" also appears as a filter option, so assert on the unique number.
    expect(screen.getByText('FBR-CERT-AYESHA')).toBeInTheDocument();
    const badge = screen.getByText('FBR-CERT-AYESHA').closest('td');
    expect(badge).toHaveTextContent('Awarded');
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
    fireEvent.click(screen.getByRole('tab', { name: /Certificate settings/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Directorate of Training')).toBeInTheDocument();
    });
  });
});
