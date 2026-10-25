import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getAttendanceApiUrl } from '@edly-io/frontend-component-fbr';
import type { Holiday, HolidayPayload } from './types';

// The list comes from the library (`getHolidays`); mutations are admin-only on the backend.

export const createHoliday = async (payload: HolidayPayload): Promise<Holiday> => {
  const { data } = await getAuthenticatedHttpClient().post(getAttendanceApiUrl('public-holidays/'), payload);
  return data;
};

export const updateHoliday = async (id: number, payload: HolidayPayload): Promise<Holiday> => {
  const { data } = await getAuthenticatedHttpClient().patch(getAttendanceApiUrl(`public-holidays/${id}/`), payload);
  return data;
};

export const deleteHoliday = async (id: number): Promise<void> => {
  await getAuthenticatedHttpClient().delete(getAttendanceApiUrl(`public-holidays/${id}/`));
};
