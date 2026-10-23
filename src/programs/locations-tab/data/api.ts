import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getAttendanceApiUrl } from '@edly-io/frontend-component-fbr';
import type { Location, LocationPayload } from './types';

// The list comes from the library (`getLocations`); mutations are admin-only on the backend.

export const createLocation = async (payload: LocationPayload): Promise<Location> => {
  const { data } = await getAuthenticatedHttpClient().post(getAttendanceApiUrl('locations/'), payload);
  return data;
};

export const updateLocation = async (id: string, payload: LocationPayload): Promise<Location> => {
  const { data } = await getAuthenticatedHttpClient().patch(getAttendanceApiUrl(`locations/${id}/`), payload);
  return data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await getAuthenticatedHttpClient().delete(getAttendanceApiUrl(`locations/${id}/`));
};
