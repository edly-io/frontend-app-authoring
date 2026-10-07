import { act, renderHook, waitFor } from '@testing-library/react';
import { initializeMocks, makeWrapper } from '@src/testUtils';
import {
  page,
  rawBadges,
  rawCurriculums,
  rawStatus,
} from '../__mocks__/fixtures';
import { apiUrls } from './api';
import {
  curriculumQueryKeys,
  useBadges,
  useCourseSearch,
  useCreateCurriculum,
  useCurriculums,
  useCurriculumManagementStatus,
  useDeleteBadge,
} from './apiHooks';

describe('curriculum-management apiHooks', () => {
  it('status: the flag comes from the API', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus(true));
    const { result } = renderHook(() => useCurriculumManagementStatus(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ enabled: false, isPending: true, isConnectionError: false });
    await waitFor(() => expect(result.current).toEqual({ enabled: true, isPending: false, isConnectionError: false }));
  });

  it.each([403, 404])('status: an HTTP %s is treated as disabled, without retrying', async (code) => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.status()).reply(code);
    const { result } = renderHook(() => useCurriculumManagementStatus(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current).toEqual({ enabled: false, isPending: false, isConnectionError: false });
    expect(axiosMock.history.get.filter((r) => r.url === apiUrls.status())).toHaveLength(1);
  });

  it('status: a 5xx is retried, then reported as a connection error (and disabled)', async () => {
    jest.useFakeTimers();
    try {
      const { axiosMock } = initializeMocks();
      axiosMock.onGet(apiUrls.status()).reply(502);
      const { result } = renderHook(() => useCurriculumManagementStatus(), { wrapper: makeWrapper() });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10000);
      });
      await waitFor(() => expect(result.current.isPending).toBe(false));
      expect(result.current).toEqual({ enabled: false, isPending: false, isConnectionError: true });
      expect(axiosMock.history.get.filter((r) => r.url === apiUrls.status())).toHaveLength(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it('useCurriculums and useBadges load all pages', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    const curriculums = renderHook(() => useCurriculums(), { wrapper: makeWrapper() });
    const badges = renderHook(() => useBadges(), { wrapper: makeWrapper() });
    await waitFor(() => expect(curriculums.result.current.data).toHaveLength(1));
    await waitFor(() => expect(badges.result.current.data).toHaveLength(4));
  });

  it('useCourseSearch does not request for a blank term', async () => {
    const { axiosMock } = initializeMocks();
    const { result } = renderHook(() => useCourseSearch('   '), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toEqual('idle');
    expect(axiosMock.history.get.filter((r) => r.url?.includes('/courses/'))).toHaveLength(0);
  });

  it('a curriculum mutation invalidates curriculums AND badges (badges embed linked_curriculums)', async () => {
    const { axiosMock, queryClient } = initializeMocks();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    const { result } = renderHook(() => useCreateCurriculum(), { wrapper: makeWrapper() });
    await result.current.mutateAsync({
      title: 'T',
      description: '',
      courseIds: ['c'],
      knowledgeCheckCourseId: 'k',
      knowledgeCheckDelayDays: 30,
      badges: { complete: null, retained: null },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: curriculumQueryKeys.curriculums() });
    expect(spy).toHaveBeenCalledWith({ queryKey: curriculumQueryKeys.badges() });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: curriculumQueryKeys.status() });
  });

  it('a badge mutation invalidates both lists too', async () => {
    const { axiosMock, queryClient } = initializeMocks();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    axiosMock.onDelete(apiUrls.badge('b1')).reply(204);
    const { result } = renderHook(() => useDeleteBadge(), { wrapper: makeWrapper() });
    await result.current.mutateAsync('b1');
    expect(spy).toHaveBeenCalledWith({ queryKey: curriculumQueryKeys.curriculums() });
    expect(spy).toHaveBeenCalledWith({ queryKey: curriculumQueryKeys.badges() });
  });

  it('a failed badge delete does not refetch the lists', async () => {
    const { axiosMock, queryClient } = initializeMocks();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    axiosMock.onDelete(apiUrls.badge('b1')).reply(500);
    const { result } = renderHook(() => useDeleteBadge(), { wrapper: makeWrapper() });
    await expect(result.current.mutateAsync('b1')).rejects.toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('mutateAsync resolves only after both lists have been refetched', async () => {
    const { axiosMock } = initializeMocks();
    let badgeFetches = 0;
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(() => {
      badgeFetches += 1;
      const results = badgeFetches === 1 ? rawBadges : rawBadges.slice(0, 1);
      // Slow enough that an un-awaited refetch is still in flight when mutateAsync resolves.
      return new Promise((resolve) => {
        setTimeout(() => resolve([200, page(results)]), 50);
      });
    });
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    axiosMock.onDelete(apiUrls.badge('b1')).reply(204);
    const { result } = renderHook(
      () => ({ badges: useBadges(), curriculums: useCurriculums(), remove: useDeleteBadge() }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.badges.data).toHaveLength(4));
    await waitFor(() => expect(result.current.curriculums.data).toHaveLength(1));

    await act(async () => {
      await result.current.remove.mutateAsync('b1');
    });

    // No waiting here: the caller (e.g. a form that then closes) must already see fresh data.
    expect(result.current.badges.isFetching).toBe(false);
    expect(result.current.badges.data).toHaveLength(1);
    expect(badgeFetches).toBe(2);
  });
});
