import { useEffect } from 'react';
import { logError } from '@edx/frontend-platform/logging';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { CourseTagsStatus, Tag } from '@src/course-tags/types';
import { getErrorStatus, retryUnlessClientError } from '@src/generic/queryErrors';
import * as api from './api';

export const courseTagQueryKeys = {
  all: ['courseTags'],
  status: (courseId: string) => [...courseTagQueryKeys.all, 'status', courseId],
  courseTags: (courseId: string) => [...courseTagQueryKeys.all, 'courseTags', courseId],
  allSuggestions: (courseId: string) => [...courseTagQueryKeys.all, 'suggestions', courseId],
  suggestions: (courseId: string, term: string) => [...courseTagQueryKeys.allSuggestions(courseId), term],
};

/** Status answers that mean course tags are off for this user: 404 without the plugin, 403 refused. */
const STATUS_HIDDEN = [403, 404];

/**
 * What the current user may do with this course's tags. Runs on every outline render, so it is fetched once per
 * course and kept for the session (`gcTime: Infinity`: closing the outline doesn't drop it). Nothing is allowed
 * until it loads, so the button stays hidden meanwhile. A 404 (plugin not installed) or a 403 hides the button for
 * good. Any other failure (5xx or network, after the retries) is logged and shows the button, so an outage shows
 * up as an error in the dialog instead of looking like the flag is off; the API still checks every change.
 */
export const useCourseTagsStatus = (courseId: string) => {
  const { data, error } = useQuery<CourseTagsStatus, Error>({
    queryKey: courseTagQueryKeys.status(courseId),
    queryFn: () => api.getStatus(courseId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
  const hidden = !!error && STATUS_HIDDEN.includes(getErrorStatus(error) ?? 0);
  useEffect(() => {
    if (error && !hidden) {
      logError(error);
    }
  }, [error, hidden]);
  if (error) {
    return { enabled: !hidden, canAssign: !hidden };
  }
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
 * shown while the next ones load, so the dropdown doesn't flicker as the author types; `TagTypeahead` keeps only
 * those that still contain the text typed.
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
      // Not awaited: the change is saved, and the author shouldn't wait for the suggestions to refetch.
      queryClient.invalidateQueries({ queryKey: courseTagQueryKeys.allSuggestions(courseId) });
    },
  });
};

/** A 404 means the tag no longer exists (deleted in Django admin), so the course doesn't have it either: removed. */
export const useUnassignTag = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: number) => {
      try {
        await api.unassignTag(courseId, tagId);
      } catch (error) {
        if (getErrorStatus(error) !== 404) {
          throw error;
        }
      }
    },
    onSuccess: (_, removedId) => {
      queryClient.setQueryData<Tag[]>(
        courseTagQueryKeys.courseTags(courseId),
        (current = []) => current.filter(({ id }) => id !== removedId),
      );
      // Not awaited: the change is saved, and the author shouldn't wait for the suggestions to refetch.
      queryClient.invalidateQueries({ queryKey: courseTagQueryKeys.allSuggestions(courseId) });
    },
  });
};
