import { getConfig } from '@edx/frontend-platform';
import { initializeMocks } from '@src/testUtils';
import { getCertificateRoster, getPlatformUsers } from './api';

const usersUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/programs/users/`;
const emptyPage = { results: [], pagination: { count: 0, num_pages: 1 } };

describe('getPlatformUsers', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onGet(usersUrl()).reply(200, emptyPage);
  });

  it('forwards enrollable=true so the Enroll Learner modal gets the full pool', async () => {
    await getPlatformUsers({ role: 'learner', programKey: 'prog-1', enrollable: true });
    expect(axiosMock.history.get[0].params).toMatchObject({
      role: 'learner',
      program_key: 'prog-1',
      enrollable: 'true',
    });
  });

  it('omits enrollable by default (Feedback recipient picker stays enrolled-only)', async () => {
    await getPlatformUsers({ role: 'learner', programKey: 'prog-1' });
    expect(axiosMock.history.get[0].params).not.toHaveProperty('enrollable');
  });
});

describe('getCertificateRoster', () => {
  const rosterUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/cms/certificates/prog%201/awards/`;
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onGet(rosterUrl()).reply(200, {
      count: 27,
      next: 'next-page',
      previous: null,
      kpis: {
        total: 30, awarded: 3, not_awarded: 27, average: '61.5',
      },
      results: [{
        username: 'ayesha',
        full_name: 'Ayesha Khan',
        avatar_url: null,
        percent: '80.0',
        result: 'pass',
        status: 'finalized',
        certificate: null,
      }],
    });
  });

  it('asks the server for one filtered page', async () => {
    await getCertificateRoster('prog 1', {
      page: 2, pageSize: 25, search: 'khan', statusFilter: 'notAwarded',
    });
    expect(axiosMock.history.get[0].params).toEqual({
      page: 2, page_size: 25, search: 'khan', certificate: 'not_awarded',
    });
  });

  it('sends no search or certificate filter when showing everyone', async () => {
    await getCertificateRoster('prog 1', {
      page: 1, pageSize: 25, search: '  ', statusFilter: 'all',
    });
    expect(axiosMock.history.get[0].params).toEqual({ page: 1, page_size: 25 });
  });

  it('returns the page rows with the whole-roster KPIs', async () => {
    const roster = await getCertificateRoster('prog 1', {
      page: 1, pageSize: 25, search: '', statusFilter: 'all',
    });
    expect(roster).toEqual({
      count: 27,
      kpis: {
        total: 30, awarded: 3, notAwarded: 27, average: '61.5',
      },
      results: [{
        username: 'ayesha',
        fullName: 'Ayesha Khan',
        avatarUrl: null,
        percent: '80.0',
        result: 'pass',
        status: 'finalized',
        certificate: null,
      }],
    });
  });
});
