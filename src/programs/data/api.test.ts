import { getConfig } from '@edx/frontend-platform';
import { initializeMocks } from '@src/testUtils';
import { getProgramDetail } from './api';

describe('program subscription permission', () => {
  it.each([true, false, undefined])('maps permission %s', async (permission) => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(`${getConfig().STUDIO_BASE_URL}/rwaq/api/programs/test/`).reply(200, {
      id: 'test', can_set_subscription: permission,
    });
    const result = await getProgramDetail('test');
    expect(result.program.canSetSubscription).toBe(permission ?? true);
  });
});
