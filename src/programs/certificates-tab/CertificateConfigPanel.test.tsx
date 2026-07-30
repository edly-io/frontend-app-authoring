import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import CertificateConfigPanel from './CertificateConfigPanel';

const mockUpdateConfigMutate = jest.fn();
const mockUploadSignatureMutateAsync = jest.fn();
const mockUseCertificateConfig = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useCertificateConfig: (...args: any[]) => mockUseCertificateConfig(...args),
  useUpdateCertificateConfig: () => ({ mutate: mockUpdateConfigMutate, isPending: false }),
  useUploadCertificateSignature: () => ({ mutateAsync: mockUploadSignatureMutateAsync, isPending: false }),
  useCertificatePreview: () => ({ data: '<div class="fbr-cert" />', isFetching: false }),
}));

const programId = 'prog-key-1';

const renderPanel = () => render(
  <CertificateConfigPanel programId={programId} />,
);

const pngFile = (name = 'sig.png', sizeBytes = 1024) => new File([new Uint8Array(sizeBytes)], name, { type: 'image/png' });

const getSignatureInputs = () => document.querySelectorAll<HTMLInputElement>('.certificate-signatory-signature__input');

describe('<CertificateConfigPanel />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseCertificateConfig.mockReturnValue({
      data: { issuedBy: 'Directorate of Training', signatories: [{ name: 'A. Director', title: 'DG' }] },
      isLoading: false,
    });
  });

  it('rejects a non-PNG file without calling the upload endpoint', async () => {
    renderPanel();
    const jpgFile = new File([new Uint8Array(1024)], 'sig.jpg', { type: 'image/jpeg' });
    fireEvent.change(getSignatureInputs()[0], { target: { files: [jpgFile] } });
    expect(await screen.findByText('Image must be in PNG format.')).toBeInTheDocument();
    expect(mockUploadSignatureMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a PNG file over the size limit without calling the upload endpoint', async () => {
    renderPanel();
    fireEvent.change(getSignatureInputs()[0], { target: { files: [pngFile('sig.png', 300 * 1024 + 1)] } });
    expect(await screen.findByText(/Image must be under 300 KB/i)).toBeInTheDocument();
    expect(mockUploadSignatureMutateAsync).not.toHaveBeenCalled();
  });

  it('uploads a valid PNG and shows the resulting thumbnail', async () => {
    mockUploadSignatureMutateAsync.mockResolvedValue({ slug: 'sig-7', url: 'https://cdn.example/sig.png' });
    renderPanel();
    fireEvent.change(getSignatureInputs()[0], { target: { files: [pngFile()] } });
    await waitFor(() => expect(mockUploadSignatureMutateAsync).toHaveBeenCalled());
    expect(await screen.findByAltText('Upload signature')).toHaveAttribute('src', 'https://cdn.example/sig.png');
  });

  it('shows an error message when the upload fails', async () => {
    mockUploadSignatureMutateAsync.mockRejectedValue(new Error('network error'));
    renderPanel();
    fireEvent.change(getSignatureInputs()[0], { target: { files: [pngFile()] } });
    expect(await screen.findByText('Could not upload signature. Please try again.')).toBeInTheDocument();
  });

  it("disables other rows' upload buttons while one row is uploading", async () => {
    let resolveUpload: (value: { slug: string; url: string }) => void = () => {};
    mockUploadSignatureMutateAsync.mockImplementation(
      () => new Promise((resolve) => { resolveUpload = resolve; }),
    );
    mockUseCertificateConfig.mockReturnValue({
      data: {
        issuedBy: 'Directorate of Training',
        signatories: [{ name: 'A. Director', title: 'DG' }, { name: 'B. Chief', title: 'Chief' }],
      },
      isLoading: false,
    });
    renderPanel();
    fireEvent.change(getSignatureInputs()[0], { target: { files: [pngFile()] } });
    // Row 0 is now uploading (shows a spinner, not its trigger button); row
    // 1's trigger button is disabled so clicking it can't silently no-op.
    const uploadButtons = await screen.findAllByRole('button', { name: /^Upload signature$/i });
    expect(uploadButtons).toHaveLength(1);
    expect(uploadButtons[0]).toBeDisabled();
    resolveUpload({ slug: 'sig-1', url: 'https://cdn.example/sig.png' });
  });

  it('removes an uploaded signature', async () => {
    mockUseCertificateConfig.mockReturnValue({
      data: {
        issuedBy: 'Directorate of Training',
        signatories: [{
          name: 'A. Director', title: 'DG', signatureSlug: 'sig-3', signatureUrl: 'https://cdn.example/sig.png',
        }],
      },
      isLoading: false,
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Remove signature/i }));
    expect(screen.getByRole('button', { name: /^Upload signature$/i })).toBeInTheDocument();
  });

  it('saves the issuing authority and signatories', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /^Save settings$/i }));
    expect(mockUpdateConfigMutate).toHaveBeenCalledWith(
      { issuedBy: 'Directorate of Training', signatories: [{ name: 'A. Director', title: 'DG' }] },
      expect.anything(),
    );
  });
});
