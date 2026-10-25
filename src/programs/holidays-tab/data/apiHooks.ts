import {
  keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient,
} from '@tanstack/react-query';
import {
  FBR_QUERY_OPTIONS, fbrKeys, getHolidays, type HolidayListParams, type PaginatedList,
} from '@edly-io/frontend-component-fbr';
import { createHoliday, deleteHoliday, updateHoliday } from './api';
import type { Holiday, HolidayPayload } from './types';

/**
 * One page of the holidays table. Same key and fetcher as the library's `useHolidays`, plus
 * `keepPreviousData` so the current page stays on screen while the next page or search loads.
 */
export const useHolidaysPage = (params: HolidayListParams) => useQuery({
  queryKey: fbrKeys.holidayList(params),
  queryFn: async () => (await getHolidays(params)) as unknown as PaginatedList<Holiday>,
  ...FBR_QUERY_OPTIONS,
  placeholderData: keepPreviousData,
});

// `fbrKeys.holidays` also covers the calendar's holiday banners.
const invalidateHolidays = (queryClient: QueryClient) => (
  queryClient.invalidateQueries({ queryKey: fbrKeys.holidays })
);

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HolidayPayload) => createHoliday(payload),
    onSuccess: () => invalidateHolidays(queryClient),
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: HolidayPayload }) => updateHoliday(id, payload),
    onSuccess: () => invalidateHolidays(queryClient),
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteHoliday(id),
    onSuccess: () => invalidateHolidays(queryClient),
  });
};
