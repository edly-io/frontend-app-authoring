import { initializeMocks } from '@src/testUtils';
import { createLocation, deleteLocation, updateLocation } from './api';

const LOCATIONS_URL = /\/fbr\/api\/attendance\/v1\/locations\/$/;
const LOCATION_URL = /\/fbr\/api\/attendance\/v1\/locations\/loc1\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
});

describe('createLocation', () => {
  it('posts to /locations/ and returns data', async () => {
    axiosMock.onPost(LOCATIONS_URL).reply(201, { id: 'loc1', name: 'Lab' });

    const result = await createLocation({ name: 'Lab', description: '', biometric_machine_serial_number: '' });

    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      name: 'Lab', description: '', biometric_machine_serial_number: '',
    });
    expect(result).toEqual({ id: 'loc1', name: 'Lab' });
  });
});

describe('updateLocation', () => {
  it('patches the location by id', async () => {
    axiosMock.onPatch(LOCATION_URL).reply(200, { id: 'loc1', name: 'Lab B' });

    const result = await updateLocation('loc1', { name: 'Lab B', description: '', biometric_machine_serial_number: '' });

    expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual({
      name: 'Lab B', description: '', biometric_machine_serial_number: '',
    });
    expect(result).toEqual({ id: 'loc1', name: 'Lab B' });
  });
});

describe('deleteLocation', () => {
  it('sends DELETE to the location endpoint', async () => {
    axiosMock.onDelete(LOCATION_URL).reply(204);

    await deleteLocation('loc1');

    expect(axiosMock.history.delete).toHaveLength(1);
  });
});
