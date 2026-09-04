import { getAuditLogs } from './auditLogApi';

const mockGet = jest.fn();

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(() => ({ LMS_BASE_URL: 'http://localhost:18000' })),
}));

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(() => ({ get: mockGet })),
}));

describe('getAuditLogs', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('sends correct params for basic call', async () => {
    mockGet.mockResolvedValue({ data: { results: [], count: 0 } });
    await getAuditLogs({ appLabel: 'fbr_programs', models: ['programcourse'] });
    const [calledUrl] = mockGet.mock.calls[0];
    expect(calledUrl).toContain('app_label=fbr_programs');
    expect(calledUrl).toContain('model=programcourse');
  });

  it('includes multiple models in query string', async () => {
    mockGet.mockResolvedValue({ data: { results: [], count: 0 } });
    await getAuditLogs({ appLabel: 'fbr_programs', models: ['program', 'enrollment'] });
    const [calledUrl] = mockGet.mock.calls[0];
    expect(calledUrl).toContain('model=program');
    expect(calledUrl).toContain('model=enrollment');
  });

  it('includes optional filters when provided', async () => {
    mockGet.mockResolvedValue({ data: { results: [], count: 0 } });
    await getAuditLogs({
      appLabel: 'fbr_programs',
      models: [],
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      programKey: 'prog-1',
    });
    const [calledUrl] = mockGet.mock.calls[0];
    expect(calledUrl).toContain('date_from=2026-09-01');
    expect(calledUrl).toContain('date_to=2026-09-30');
    expect(calledUrl).toContain('program_key=prog-1');
  });

  it('returns results and count from response', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1 }], count: 1 } });
    const result = await getAuditLogs({ appLabel: 'fbr_programs', models: [] });
    expect(result.results).toEqual([{ id: 1 }]);
    expect(result.count).toBe(1);
  });
});
