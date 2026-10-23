import { initializeMocks } from '@src/testUtils';
import { getSubstituteRequest, updateLeaveThreshold } from './api';

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

describe('updateLeaveThreshold', () => {
  it('keeps a program key from the URL inside its own path segment', async () => {
    axiosMock.onPatch().reply(200, {});
    await updateLeaveThreshold('foo/../bar', 5);
    expect(axiosMock.history.patch[0].url).toMatch(/\/fbr\/api\/programs\/foo%2F..%2Fbar\/$/);
  });
});
