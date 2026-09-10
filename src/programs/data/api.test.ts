import { getConfig } from '@edx/frontend-platform';
import { initializeMocks } from '@src/testUtils';
import { getPlatformUsers } from './api';

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
