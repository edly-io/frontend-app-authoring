import { initializeMocks } from '@src/testUtils';
import { getSubstituteRequest } from './api';

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet().reply(200, {});
});

describe('getSubstituteRequest', () => {
  it('fetches the request by id', async () => {
    await getSubstituteRequest('14');
    expect(axiosMock.history.get[0].url).toMatch(/\/substitute-requests\/14\/$/);
  });

  it('keeps an id from the URL inside its own path segment', async () => {
    await getSubstituteRequest('../../users/me');
    expect(axiosMock.history.get[0].url).toMatch(/\/substitute-requests\/..%2F..%2Fusers%2Fme\/$/);
  });
});
