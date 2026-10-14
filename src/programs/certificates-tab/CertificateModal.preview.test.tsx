import { getConfig } from '@edx/frontend-platform';
import {
  initializeMocks, render, waitFor,
} from '@src/testUtils';
import CertificateModal from './CertificateModal';
import type { CertificateConfig, CertificateRosterRow } from '../data/types';

jest.mock('@edly-io/frontend-component-fbr', () => ({
  __esModule: true,
  CertificateHtmlView: () => null,
  PrintCertificateButton: () => null,
}));

const previewUrl = () => (
  `${getConfig().STUDIO_BASE_URL}/fbr/api/cms/certificates/prog-key-1/certificate/preview/`
);

const config: CertificateConfig = { issuedBy: 'Directorate of Training', signatories: [] };

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
  certificate: { certificateNumber: 'FBR-CERT-AYESHA', status: 'active', issuedAt: '2026-06-18T00:00:00Z' },
};

const noop = () => {};

const renderModal = (row: CertificateRosterRow) => render(
  <CertificateModal
    isOpen
    onClose={noop}
    row={row}
    programId="prog-key-1"
    config={config}
    programName="Specialised Training Programme"
    onAward={noop}
    onRevoke={noop}
    isAwarding={false}
    isRevoking={false}
  />,
);

describe('<CertificateModal /> preview request', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onPost(previewUrl()).reply(200, { html: '<div class="fbr-cert" />' });
  });

  const sentBody = async () => {
    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    return JSON.parse(axiosMock.history.post[0].data);
  };

  it('sends the awarded certificate number so the preview shows its real QR code', async () => {
    renderModal(awardedRow);
    expect(await sentBody()).toMatchObject({ certificate_number: 'FBR-CERT-AYESHA' });
  });

  it('omits the certificate number for a not-yet-awarded row', async () => {
    renderModal(pendingRow);
    expect(await sentBody()).not.toHaveProperty('certificate_number');
  });
});
