import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { logError } from '@edx/frontend-platform/logging';
import { initializeMocks, makeWrapper } from '@src/testUtils';

import { apiUrls } from './api';
import {
  courseTagQueryKeys,
  useAssignTag,
  useCourseTags,
  useCourseTagsStatus,
  useTagSuggestions,
  useUnassignTag,
} from './apiHooks';

jest.mock('@edx/frontend-platform/logging', () => ({
  ...jest.requireActual('@edx/frontend-platform/logging'),
  logError: jest.fn(),
}));

const COURSE_ID = 'course-v1:Uber+101+2026';
const OTHER_COURSE_ID = 'course-v1:Uber+202+2026';

let axiosMock;
let queryClient;

const wrapper = () => makeWrapper();

describe('course tags hooks', () => {
  beforeEach(() => {
    ({ axiosMock, queryClient } = initializeMocks());
  });

  describe('useCourseTagsStatus', () => {
    it('is all false until the status loads', () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true });
      const { result } = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
      expect(result.current).toEqual({ enabled: false, canAssign: false });
    });

    it('returns the status once loaded', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true });
      const { result } = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.enabled).toBe(true));
      expect(result.current).toEqual({ enabled: true, canAssign: true });
    });

    it.each([403, 404])('stays all false on a %s, hiding the button, without a retry or a log', async (code) => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(code);
      const { result } = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
      await waitFor(() =>
        expect(queryClient.getQueryState(courseTagQueryKeys.status(COURSE_ID))?.status).toBe('error')
      );
      expect(result.current).toEqual({ enabled: false, canAssign: false });
      expect(axiosMock.history.get).toHaveLength(1);
      expect(logError).not.toHaveBeenCalled();
    });

    describe('on fake time', () => {
      // React Query retries a 5xx three times with a backoff of 1 + 2 + 4 s, and drops unused data after gcTime.
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('retries a 5xx', async () => {
        axiosMock.onGet(apiUrls.status(COURSE_ID)).replyOnce(500);
        axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true });
        const { result } = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.enabled).toBe(true), { timeout: 3000 });
        expect(axiosMock.history.get).toHaveLength(2);
        expect(logError).not.toHaveBeenCalled();
      });

      it('allows everything after the retries of a 5xx are spent, so the button shows, and logs it', async () => {
        axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(500);
        const { result } = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.enabled).toBe(true), { timeout: 10000 });
        expect(result.current).toEqual({ enabled: true, canAssign: true });
        expect(axiosMock.history.get).toHaveLength(4);
        expect(logError).toHaveBeenCalledTimes(1);
      });

      it('is fetched once per course and session: a later mount reuses it, even after 5 minutes unused', async () => {
        axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true });
        const first = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
        await waitFor(() => expect(first.result.current.enabled).toBe(true));
        first.unmount();
        await act(async () => {
          jest.advanceTimersByTime(10 * 60_000); // past React Query's default gcTime of 5 minutes
        });
        const second = renderHook(() => useCourseTagsStatus(COURSE_ID), { wrapper: wrapper() });
        expect(second.result.current).toEqual({ enabled: true, canAssign: true }); // from the cache, at once
        await act(async () => {
          jest.runOnlyPendingTimers(); // let a refetch, if any, go out
        });
        expect(axiosMock.history.get).toHaveLength(1);
      });
    });
  });

  describe('useTagSuggestions', () => {
    it('fetches nothing for an empty term', async () => {
      const { result } = renderHook(() => useTagSuggestions(COURSE_ID, ''), { wrapper: wrapper() });
      await act(async () => {
        await Promise.resolve();
      });
      expect(axiosMock.history.get).toHaveLength(0);
      expect(result.current.data).toBeUndefined();
    });

    it('fetches the suggestions of a term', async () => {
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road')).reply(200, [{ id: 1, name: 'Road' }]);
      const { result } = renderHook(() => useTagSuggestions(COURSE_ID, 'road'), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'Road' }]));
    });

    it('keeps the previous results while the next term loads', async () => {
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'ro')).reply(200, [{ id: 1, name: 'Road' }]);
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'roa')).reply(() => new Promise(() => {}));
      const { result, rerender } = renderHook(
        ({ term }) => useTagSuggestions(COURSE_ID, term),
        { wrapper: wrapper(), initialProps: { term: 'ro' } },
      );
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      rerender({ term: 'roa' });
      expect(result.current.data).toEqual([{ id: 1, name: 'Road' }]);
    });
  });

  describe('useCourseTags', () => {
    it('loads the course tags', async () => {
      axiosMock.onGet(apiUrls.courseTags(COURSE_ID)).reply(200, [{ id: 1, name: 'Road' }]);
      const { result } = renderHook(() => useCourseTags(COURSE_ID), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'Road' }]));
    });
  });

  describe('mutations keep the caches in step', () => {
    const seed = () => {
      queryClient.setQueryData(courseTagQueryKeys.courseTags(COURSE_ID), [{ id: 2, name: 'banana' }]);
      queryClient.setQueryData(courseTagQueryKeys.courseTags(OTHER_COURSE_ID), [{ id: 2, name: 'banana' }]);
      queryClient.setQueryData(courseTagQueryKeys.suggestions(COURSE_ID, 'a'), []);
      queryClient.setQueryData(courseTagQueryKeys.suggestions(OTHER_COURSE_ID, 'a'), []);
    };
    const isInvalidated = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated;

    it('assign adds the tag in name order, without a duplicate, and refreshes only this course suggestions', async () => {
      seed();
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 1, name: 'Apple' });
      const { result } = renderHook(() => useAssignTag(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('apple');
      });
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(COURSE_ID))).toEqual([
        { id: 1, name: 'Apple' },
        { id: 2, name: 'banana' },
      ]);
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(OTHER_COURSE_ID))).toHaveLength(1);
      expect(isInvalidated(courseTagQueryKeys.suggestions(COURSE_ID, 'a'))).toBe(true);
      expect(isInvalidated(courseTagQueryKeys.suggestions(OTHER_COURSE_ID, 'a'))).toBeFalsy();
      await act(async () => {
        await result.current.mutateAsync('apple');
      });
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(COURSE_ID))).toHaveLength(2);
    });

    it('assign posts the name', async () => {
      seed();
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 1, name: 'Apple' });
      const { result } = renderHook(() => useAssignTag(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('apple');
      });
      expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({ name: 'apple' });
    });

    it('unassign removes only that tag from only that course', async () => {
      seed();
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, 2)).reply(204);
      const { result } = renderHook(() => useUnassignTag(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync(2);
      });
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(COURSE_ID))).toEqual([]);
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(OTHER_COURSE_ID))).toHaveLength(1);
      expect(isInvalidated(courseTagQueryKeys.suggestions(COURSE_ID, 'a'))).toBe(true);
    });

    it('a failed assign changes no cache', async () => {
      seed();
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(500);
      const { result } = renderHook(() => useAssignTag(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('a').catch(() => undefined);
      });
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(COURSE_ID))).toHaveLength(1);
      expect(isInvalidated(courseTagQueryKeys.suggestions(COURSE_ID, 'a'))).toBeFalsy();
    });

    it('unassign treats a 404 (the tag no longer exists) as removed', async () => {
      seed();
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, 2)).reply(404, { detail: 'Tag not found.' });
      const { result } = renderHook(() => useUnassignTag(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync(2);
      });
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(COURSE_ID))).toEqual([]);
      expect(isInvalidated(courseTagQueryKeys.suggestions(COURSE_ID, 'a'))).toBe(true);
    });

    it('a failed unassign changes no cache', async () => {
      seed();
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, 2)).reply(403);
      const { result } = renderHook(() => useUnassignTag(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync(2).catch(() => undefined);
      });
      expect(queryClient.getQueryData(courseTagQueryKeys.courseTags(COURSE_ID))).toHaveLength(1);
    });
  });
});
