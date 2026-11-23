import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useLinkInstructorToCourse, useUnlinkInstructorFromCourse } from './apiHooks';
import { linkInstructorToCourse, unlinkInstructorFromCourse } from './api';

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
