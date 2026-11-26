import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { Tag } from '@src/course-tags/types';
import { retryUnlessClientError } from '@src/generic/queryErrors';
import * as api from './api';

export const courseTagQueryKeys = {
  all: ['courseTags'],
  status: (courseId: string) => [...courseTagQueryKeys.all, 'status', courseId],
  courseTags: (courseId: string) => [...courseTagQueryKeys.all, 'courseTags', courseId],
  allSuggestions: (courseId: string) => [...courseTagQueryKeys.all, 'suggestions', courseId],
  suggestions: (courseId: string, term: string) => [...courseTagQueryKeys.allSuggestions(courseId), term],
};

/**
 * What the current user may do with this course's tags. Runs on every outline render, so it is fetched once per
 * course and session. Any error (e.g. 404 when the plugin isn't installed) counts as "nothing allowed", which hides
 * the button.
 */
export const useCourseTagsStatus = (courseId: string) => {
  const { data } = useQuery({
    queryKey: courseTagQueryKeys.status(courseId),
    queryFn: () => api.getStatus(courseId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
  return {
    enabled: data?.enabled ?? false,
    canAssign: data?.canAssign ?? false,
  };
};

/** The course's assigned tags. Only mounted while the tags modal is open. */
export const useCourseTags = (courseId: string) =>
  useQuery({
    queryKey: courseTagQueryKeys.courseTags(courseId),
    queryFn: () => api.getCourseTags(courseId),
    retry: retryUnlessClientError,
  });

/**
 * Tags matching `term` for the course's picker; nothing is fetched for an empty term. The previous results stay
 * shown while the next ones load, so the dropdown doesn't flicker as the author types.
 */
export const useTagSuggestions = (courseId: string, term: string) =>
  useQuery({
    queryKey: courseTagQueryKeys.suggestions(courseId, term),
    queryFn: () => api.getTagSuggestions(courseId, term),
    enabled: !!term,
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });

const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Assign and unassign update the course's list in place (no refetch, so the chip appears or goes at once) and
 * refresh the suggestions, which leave out the course's own tags.
 */
export const useAssignTag = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.assignTag(courseId, name),
    onSuccess: (tag) => {
      queryClient.setQueryData<Tag[]>(
        courseTagQueryKeys.courseTags(courseId),
        (current = []) => (current.some(({ id }) => id === tag.id) ? current : [...current, tag].sort(byName)),
      );
      return queryClient.invalidateQueries({ queryKey: courseTagQueryKeys.allSuggestions(courseId) });
    },
  });
};

export const useUnassignTag = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: number) => api.unassignTag(courseId, tagId),
    onSuccess: (_, removedId) => {
      queryClient.setQueryData<Tag[]>(
        courseTagQueryKeys.courseTags(courseId),
        (current = []) => current.filter(({ id }) => id !== removedId),
      );
      return queryClient.invalidateQueries({ queryKey: courseTagQueryKeys.allSuggestions(courseId) });
    },
  });
};
