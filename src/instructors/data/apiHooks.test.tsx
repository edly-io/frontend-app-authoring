import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useLinkInstructorToCourse, useSearchInstructorUsers, useUnlinkInstructorFromCourse } from './apiHooks';
import { linkInstructorToCourse, searchInstructorUsers, unlinkInstructorFromCourse } from './api';

jest.mock('./api');

describe('instructor link and unlink hooks', () => {
  const setup = () => {
    const queryClient = new QueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { invalidate, wrapper };
  };

  it.each([
    ['link', useLinkInstructorToCourse, linkInstructorToCourse],
    ['unlink', useUnlinkInstructorFromCourse, unlinkInstructorFromCourse],
  ])('%s refreshes the course instructors and every cached instructor list', async (_name, useHook, apiFn) => {
    (apiFn as jest.Mock).mockResolvedValue({});
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useHook(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ courseId: 'course-v1:A+B+C', instructorId: 1 });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['courseInstructors', 'course-v1:A+B+C'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['instructors'] });
  });
});

describe('useSearchInstructorUsers', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not call the API for an empty search', () => {
    renderHook(() => useSearchInstructorUsers('  '), { wrapper });

    expect(searchInstructorUsers).not.toHaveBeenCalled();
  });

  it('returns the users found for a term', async () => {
    const rows = [{ id: 1, username: 'amina', name: 'Amina Khan' }];
    (searchInstructorUsers as jest.Mock).mockResolvedValue(rows);

    const { result } = renderHook(() => useSearchInstructorUsers('ami'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(rows));
    expect(searchInstructorUsers).toHaveBeenCalledWith('ami');
  });
});
