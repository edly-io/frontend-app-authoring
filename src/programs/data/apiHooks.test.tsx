import { getConfig } from '@edx/frontend-platform';
import {
  act, initializeMocks, makeWrapper, renderHook,
} from '@src/testUtils';
import { useAwardCertificates, useRevokeCertificate } from './apiHooks';
import type { CertificateRosterPage, CertificateRosterRow } from './types';

const programId = 'prog-1';
const certificatesUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/cms/certificates`;
const rosterKey = ['certificateRoster', programId, {
  page: 1, pageSize: 25, search: '', statusFilter: 'all',
}];

const row = (username: string, certificateNumber: string | null): CertificateRosterRow => ({
  username,
  fullName: username,
  avatarUrl: null,
  percent: null,
  result: null,
  status: null,
  certificate: certificateNumber
    ? { certificateNumber, status: 'active', issuedAt: '2026-06-18T00:00:00Z' }
    : null,
});

describe('certificate award/revoke cache updates', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];
  let queryClient: ReturnType<typeof initializeMocks>['queryClient'];

  beforeEach(() => {
    ({ axiosMock, queryClient } = initializeMocks());
  });

  const cachedPage = () => queryClient.getQueryData<CertificateRosterPage>(rosterKey);

  it('marks the awarded row and moves one trainee from not awarded to awarded', async () => {
    queryClient.setQueryData<CertificateRosterPage>(rosterKey, {
      count: 2,
      kpis: {
        total: 2, awarded: 0, notAwarded: 2, average: null,
      },
      results: [row('ayesha', null), row('jawad', null)],
    });
    axiosMock.onPost(`${certificatesUrl()}/${programId}/awards/`).reply(200, { ok: ['FBR-CERT-1'], errors: [] });
    const { result } = renderHook(() => useAwardCertificates(programId), { wrapper: makeWrapper() });

    await act(() => result.current.mutateAsync(['jawad']));

    expect(cachedPage()?.results[1].certificate?.certificateNumber).toBe('FBR-CERT-1');
    expect(cachedPage()?.results[0].certificate).toBeNull();
    expect(cachedPage()?.kpis).toEqual({
      total: 2, awarded: 1, notAwarded: 1, average: null,
    });
  });

  it('clears the revoked row and moves one trainee from awarded to not awarded', async () => {
    queryClient.setQueryData<CertificateRosterPage>(rosterKey, {
      count: 2,
      kpis: {
        total: 2, awarded: 2, notAwarded: 0, average: null,
      },
      results: [row('ayesha', 'FBR-CERT-A'), row('jawad', 'FBR-CERT-J')],
    });
    axiosMock.onPost(`${certificatesUrl()}/awards/FBR-CERT-J/revoke/`).reply(200);
    const { result } = renderHook(() => useRevokeCertificate(programId), { wrapper: makeWrapper() });

    await act(() => result.current.mutateAsync('FBR-CERT-J'));

    expect(cachedPage()?.results[1].certificate).toBeNull();
    expect(cachedPage()?.results[0].certificate?.certificateNumber).toBe('FBR-CERT-A');
    expect(cachedPage()?.kpis).toEqual({
      total: 2, awarded: 1, notAwarded: 1, average: null,
    });
  });
});
