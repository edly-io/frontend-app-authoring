import {
  keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient,
} from '@tanstack/react-query';
import {
  FBR_QUERY_OPTIONS, fbrKeys, getLocations, type LocationListParams, type PaginatedList,
} from '@edly-io/frontend-component-fbr';
import { createLocation, deleteLocation, updateLocation } from './api';
import type { Location, LocationPayload } from './types';

/**
 * One page of the locations table. Same key and fetcher as the library's `useLocations`, plus
 * `keepPreviousData` so the current page stays on screen (and the paginated table stays mounted)
 * while the next page or search result loads.
 */
export const useLocationsPage = (params: LocationListParams) => useQuery({
  queryKey: fbrKeys.locationList(params),
  queryFn: async () => (await getLocations(params)) as unknown as PaginatedList<Location>,
  ...FBR_QUERY_OPTIONS,
  placeholderData: keepPreviousData,
});

const invalidateLocationData = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: fbrKeys.locations });
  queryClient.invalidateQueries({ queryKey: fbrKeys.auditLogs });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LocationPayload) => createLocation(payload),
    onSuccess: () => invalidateLocationData(queryClient),
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LocationPayload }) => updateLocation(id, payload),
    onSuccess: () => invalidateLocationData(queryClient),
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => invalidateLocationData(queryClient),
  });
};
