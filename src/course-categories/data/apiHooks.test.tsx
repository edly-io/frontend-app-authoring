import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { initializeMocks, makeWrapper } from '@src/testUtils';

import { apiUrls } from './api';
import {
  courseCategoryQueryKeys,
  useAssignCategory,
  useCategories,
  useCourseCategoriesStatus,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  useUnassignCategory,
} from './apiHooks';

const COURSE_ID = 'course-v1:Uber+101+2026';
const OTHER_COURSE_ID = 'course-v1:Uber+202+2026';

let axiosMock;
let queryClient;

const wrapper = () => makeWrapper();

describe('course categories hooks', () => {
  beforeEach(() => {
    ({ axiosMock, queryClient } = initializeMocks());
  });

  describe('useCourseCategoriesStatus', () => {
    it('is all false until the status loads', () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true, can_manage: true });
      const { result } = renderHook(() => useCourseCategoriesStatus(COURSE_ID), { wrapper: wrapper() });
      expect(result.current).toEqual({ enabled: false, canAssign: false, canManage: false });
    });

    it('returns the status once loaded', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true, can_manage: false });
      const { result } = renderHook(() => useCourseCategoriesStatus(COURSE_ID), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.enabled).toBe(true));
      expect(result.current).toEqual({ enabled: true, canAssign: true, canManage: false });
    });

    it('stays all false on an error, without retrying a 4xx', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(404);
      const { result } = renderHook(() => useCourseCategoriesStatus(COURSE_ID), { wrapper: wrapper() });
      await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
      expect(result.current).toEqual({ enabled: false, canAssign: false, canManage: false });
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('is fetched once per course: a second mount reuses the cached status', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: true, can_manage: false });
      const first = renderHook(() => useCourseCategoriesStatus(COURSE_ID), { wrapper: wrapper() });
      await waitFor(() => expect(first.result.current.enabled).toBe(true));
      renderHook(() => useCourseCategoriesStatus(COURSE_ID), { wrapper: wrapper() });
      expect(axiosMock.history.get).toHaveLength(1);
    });
  });

  describe('mutations keep the caches in step', () => {
    const seed = () => {
      queryClient.setQueryData(courseCategoryQueryKeys.categories(), []);
      queryClient.setQueryData(courseCategoryQueryKeys.courseCategories(COURSE_ID), [{ name: 'B', slug: 'b' }]);
      queryClient.setQueryData(courseCategoryQueryKeys.courseCategories(OTHER_COURSE_ID), [{ name: 'B', slug: 'b' }]);
    };
    const isInvalidated = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated;

    it('assign adds the category in name order, without a duplicate, and refreshes the categories', async () => {
      seed();
      axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(201, { name: 'A', slug: 'a' });
      const { result } = renderHook(() => useAssignCategory(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('a');
      });
      expect(queryClient.getQueryData(courseCategoryQueryKeys.courseCategories(COURSE_ID))).toEqual([
        { name: 'A', slug: 'a' },
        { name: 'B', slug: 'b' },
      ]);
      expect(queryClient.getQueryData(courseCategoryQueryKeys.courseCategories(OTHER_COURSE_ID))).toHaveLength(1);
      await act(async () => {
        await result.current.mutateAsync('a');
      });
      expect(queryClient.getQueryData(courseCategoryQueryKeys.courseCategories(COURSE_ID))).toHaveLength(2);
    });

    it('unassign removes only that category from only that course', async () => {
      seed();
      axiosMock.onDelete(apiUrls.courseCategory(COURSE_ID, 'b')).reply(204);
      const { result } = renderHook(() => useUnassignCategory(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('b');
      });
      expect(queryClient.getQueryData(courseCategoryQueryKeys.courseCategories(COURSE_ID))).toEqual([]);
      expect(queryClient.getQueryData(courseCategoryQueryKeys.courseCategories(OTHER_COURSE_ID))).toHaveLength(1);
    });

    it('a failed assign changes no cache', async () => {
      seed();
      axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(500);
      const { result } = renderHook(() => useAssignCategory(COURSE_ID), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('a').catch(() => undefined);
      });
      expect(queryClient.getQueryData(courseCategoryQueryKeys.courseCategories(COURSE_ID))).toHaveLength(1);
      expect(isInvalidated(courseCategoryQueryKeys.categories())).toBeFalsy();
    });

    it('create invalidates the categories list only', async () => {
      seed();
      axiosMock.onPost(apiUrls.categories()).reply(201, { name: 'N', slug: 'n', course_count: 0 });
      const { result } = renderHook(() => useCreateCategory(), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('N');
      });
      expect(isInvalidated(courseCategoryQueryKeys.categories())).toBe(true);
      expect(isInvalidated(courseCategoryQueryKeys.courseCategories(COURSE_ID))).toBeFalsy();
    });

    const expectEverythingInvalidated = () => {
      expect(isInvalidated(courseCategoryQueryKeys.categories())).toBe(true);
      expect(isInvalidated(courseCategoryQueryKeys.courseCategories(COURSE_ID))).toBe(true);
      expect(isInvalidated(courseCategoryQueryKeys.courseCategories(OTHER_COURSE_ID))).toBe(true);
    };

    it('rename invalidates the categories and every course list', async () => {
      seed();
      axiosMock.onPatch(apiUrls.category('b')).reply(200, { name: 'C', slug: 'b', course_count: 0 });
      const { result } = renderHook(() => useRenameCategory(), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync({ slug: 'b', name: 'C' });
      });
      expectEverythingInvalidated();
    });

    it('delete invalidates the categories and every course list', async () => {
      seed();
      axiosMock.onDelete(apiUrls.category('b')).reply(204);
      const { result } = renderHook(() => useDeleteCategory(), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync('b');
      });
      expectEverythingInvalidated();
    });
  });

  it('useCategories reports a 4xx error without retrying', async () => {
    axiosMock.onGet(apiUrls.categoriesPage(1)).reply(403);
    const { result } = renderHook(() => useCategories(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(axiosMock.history.get).toHaveLength(1);
  });
});
