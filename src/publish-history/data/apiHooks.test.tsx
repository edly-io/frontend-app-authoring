import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type MockAdapter from 'axios-mock-adapter';
import { initializeMocks, makeWrapper } from '@src/testUtils';

import { apiUrls } from './api';
import { publishHistoryQueryKeys, useDiff, usePublishHistoryStatus, useVersions } from './apiHooks';

const COURSE_ID = 'course-v1:Uber+101+2026';
const OTHER_COURSE_ID = 'course-v1:Uber+202+2026';
const V3 = '3'.repeat(24);
const V2 = '2'.repeat(24);

let axiosMock: MockAdapter;
let queryClient;

const row = (id: string) => ({
  id,
  published_at: null,
  published_by: null,
  previous_id: null,
  is_current: false,
});
const emptyDiff = {
  from: { id: V2, kind: 'version', at: null, by: null },
  to: { id: V3, kind: 'version', at: null, by: null },
  identical: false,
  total_changes: 0,
  truncated: false,
  tree: [],
};

describe('publish history hooks', () => {
  beforeEach(() => {
    ({ axiosMock, queryClient } = initializeMocks());
  });

  describe('usePublishHistoryStatus', () => {
    it('is all false until the status loads', () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_view: true });
      const { result } = renderHook(() => usePublishHistoryStatus(COURSE_ID), { wrapper: makeWrapper() });
      expect(result.current).toEqual({ enabled: false, canView: false });
    });

    it('returns the status once loaded', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_view: true });
      const { result } = renderHook(() => usePublishHistoryStatus(COURSE_ID), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current).toEqual({ enabled: true, canView: true }));
    });

    it.each([403, 404])('stays all false on a %s and does not retry', async (code) => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(code);
      const { result } = renderHook(() => usePublishHistoryStatus(COURSE_ID), { wrapper: makeWrapper() });
      await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
      expect(result.current).toEqual({ enabled: false, canView: false });
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('is fetched once per course and reused', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_view: true });
      const wrapper = makeWrapper();
      const first = renderHook(() => usePublishHistoryStatus(COURSE_ID), { wrapper });
      await waitFor(() => expect(first.result.current.enabled).toBe(true));
      renderHook(() => usePublishHistoryStatus(COURSE_ID), { wrapper });
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('is cached per course', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_view: true });
      axiosMock.onGet(apiUrls.status(OTHER_COURSE_ID)).reply(200, { enabled: true, can_view: false });
      const wrapper = makeWrapper();
      const first = renderHook(() => usePublishHistoryStatus(COURSE_ID), { wrapper });
      const second = renderHook(() => usePublishHistoryStatus(OTHER_COURSE_ID), { wrapper });
      await waitFor(() => expect(first.result.current.canView).toBe(true));
      await waitFor(() => expect(second.result.current.enabled).toBe(true));
      expect(second.result.current.canView).toBe(false);
    });
  });

  describe('useVersions', () => {
    it('follows the next cursor with fetchNextPage', async () => {
      axiosMock.onGet(apiUrls.versions(COURSE_ID)).reply(200, {
        next: `http://x/?after=${V3}`,
        results: [row(V3)],
        history_ends: null,
      });
      axiosMock.onGet(apiUrls.versions(COURSE_ID, V3)).reply(200, {
        next: null,
        results: [row(V2)],
        history_ends: 'course_created',
      });
      const { result } = renderHook(() => useVersions(COURSE_ID), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
      expect(result.current.hasNextPage).toBe(true);
      await result.current.fetchNextPage();
      await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.data?.pages[1].historyEnds).toBe('course_created');
    });

    it('refetches on a new mount despite the app\'s one-hour default stale time (a publish adds a version)', async () => {
      // src/index.jsx gives every query a one-hour staleTime; the test client doesn't, so set it here.
      queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 60 * 60_000 } });
      axiosMock.onGet(apiUrls.versions(COURSE_ID)).reply(200, { next: null, results: [row(V3)], history_ends: null });
      const wrapper = makeWrapper();
      const first = renderHook(() => useVersions(COURSE_ID), { wrapper });
      await waitFor(() => expect(first.result.current.data?.pages).toHaveLength(1));
      renderHook(() => useVersions(COURSE_ID), { wrapper });
      await waitFor(() => expect(axiosMock.history.get).toHaveLength(2));
    });

    it('does not retry a client error', async () => {
      axiosMock.onGet(apiUrls.versions(COURSE_ID)).reply(403);
      const { result } = renderHook(() => useVersions(COURSE_ID), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(axiosMock.history.get).toHaveLength(1);
    });
  });

  describe('useDiff', () => {
    it('does not fetch while against is null', async () => {
      const { result } = renderHook(() => useDiff(COURSE_ID, V3, null), { wrapper: makeWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
      expect(axiosMock.history.get).toHaveLength(0);
    });

    it('fetches once against is set', async () => {
      axiosMock.onGet(apiUrls.diff(COURSE_ID, V3, 'published')).reply(200, emptyDiff);
      const { result } = renderHook(() => useDiff(COURSE_ID, V3, 'published'), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current.data?.totalChanges).toBe(0));
    });

    it('does not retry a 404 or 410', async () => {
      axiosMock.onGet().reply(410);
      const { result } = renderHook(() => useDiff(COURSE_ID, V3, 'previous'), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('treats a comparison of two versions as never stale', async () => {
      axiosMock.onGet().reply(200, emptyDiff);
      const { result } = renderHook(() => useDiff(COURSE_ID, V3, V2), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current.data).toBeDefined());
      const query = queryClient.getQueryCache().find({
        queryKey: publishHistoryQueryKeys.diff(COURSE_ID, V3, V2),
      });
      expect(query.isStaleByTime(Infinity)).toBe(false);
    });

    it('always refetches a comparison with the current published version on a new mount', async () => {
      axiosMock.onGet().reply(200, emptyDiff);
      const wrapper = makeWrapper();
      const first = renderHook(() => useDiff(COURSE_ID, V3, 'published'), { wrapper });
      await waitFor(() => expect(first.result.current.data).toBeDefined());
      renderHook(() => useDiff(COURSE_ID, V3, 'published'), { wrapper });
      await waitFor(() => expect(axiosMock.history.get).toHaveLength(2));
    });

    it('always refetches a comparison with the draft on a new mount', async () => {
      axiosMock.onGet().reply(200, emptyDiff);
      const wrapper = makeWrapper();
      const first = renderHook(() => useDiff(COURSE_ID, V3, 'draft'), { wrapper });
      await waitFor(() => expect(first.result.current.data).toBeDefined());
      renderHook(() => useDiff(COURSE_ID, V3, 'draft'), { wrapper });
      await waitFor(() => expect(axiosMock.history.get).toHaveLength(2));
    });

    it('does not refetch a comparison with the current published version on window focus or reconnect', async () => {
      axiosMock.onGet().reply(200, emptyDiff);
      const { result } = renderHook(() => useDiff(COURSE_ID, V3, 'published'), { wrapper: makeWrapper() });
      await waitFor(() => expect(result.current.data).toBeDefined());
      await act(async () => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
        onlineManager.setOnline(false);
        onlineManager.setOnline(true);
        // The client refetches after resuming paused mutations, a few ticks later.
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      });
      focusManager.setFocused(undefined);
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it.each(['previous', V2])('does not refetch a comparison against %s on a new mount', async (against) => {
      axiosMock.onGet().reply(200, emptyDiff);
      const wrapper = makeWrapper();
      const first = renderHook(() => useDiff(COURSE_ID, V3, against), { wrapper });
      await waitFor(() => expect(first.result.current.data).toBeDefined());
      renderHook(() => useDiff(COURSE_ID, V3, against), { wrapper });
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('keys the cache by course, version and against', () => {
      expect(publishHistoryQueryKeys.diff(COURSE_ID, V3, 'draft')).not.toEqual(
        publishHistoryQueryKeys.diff(OTHER_COURSE_ID, V3, 'draft'),
      );
      expect(publishHistoryQueryKeys.diff(COURSE_ID, V3, 'draft')).not.toEqual(
        publishHistoryQueryKeys.diff(COURSE_ID, V3, 'published'),
      );
    });
  });
});
