import { initializeMocks } from '@src/testUtils';
import { createHoliday, deleteHoliday, updateHoliday } from './api';

const HOLIDAYS_URL = /\/fbr\/api\/attendance\/v1\/public-holidays\/$/;
const HOLIDAY_URL = /\/fbr\/api\/attendance\/v1\/public-holidays\/5\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
});

describe('createHoliday', () => {
  it('posts to /public-holidays/ and returns data', async () => {
    axiosMock.onPost(HOLIDAYS_URL).reply(201, { id: 1, name: 'Eid' });

    const result = await createHoliday({
      name: 'Eid', start_date: '2026-04-01', end_date: '2026-04-01', description: '',
    });

    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      name: 'Eid', start_date: '2026-04-01', end_date: '2026-04-01', description: '',
    });
    expect(result).toEqual({ id: 1, name: 'Eid' });
  });
});

describe('updateHoliday', () => {
  it('patches the holiday by id', async () => {
    axiosMock.onPatch(HOLIDAY_URL).reply(200, { id: 5, name: 'Eid Updated' });

    const result = await updateHoliday(5, {
      name: 'Eid Updated', start_date: '2026-04-01', end_date: '2026-04-01', description: '',
    });

    expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual(expect.objectContaining({ name: 'Eid Updated' }));
    expect(result).toEqual({ id: 5, name: 'Eid Updated' });
  });
});

describe('deleteHoliday', () => {
  it('sends DELETE to the holiday endpoint', async () => {
    axiosMock.onDelete(HOLIDAY_URL).reply(204);

    await deleteHoliday(5);

    expect(axiosMock.history.delete).toHaveLength(1);
  });
});
