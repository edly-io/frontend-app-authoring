import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCourseToInstructor,
  createInstructor,
  getInstructorDetail,
  getInstructors,
  getInstructorsForCourse,
  getInstructorsPage,
  linkInstructorToCourse,
  removeCourseFromInstructor,
  unlinkInstructorFromCourse,
  updateInstructor,
} from './api';
import type { InstructorDetailResponse, InstructorProfile } from './types';

// Every instructor across all pages. For callers that need the whole list
// rather than one page (e.g. the course "link an instructor" modal).
export const useInstructors = () => useQuery({
  queryKey: ['instructors'],
  queryFn: getInstructors,
});

// One page, with search and sort applied server-side. The params are part of
// the query key so each page/search/sort combination is cached separately and
// paging back and forth doesn't refetch.
export const useInstructorsPage = (
  params: { page?: number; search?: string; ordering?: string } = {},
) => useQuery({
  queryKey: ['instructors', 'page', params.page ?? 1, params.search ?? '', params.ordering ?? ''],
  queryFn: () => getInstructorsPage(params),
  // Keeps the previous page visible while the next one loads, instead of
  // flashing the loading spinner on every page change.
  placeholderData: (previous) => previous,
});

export const useInstructorDetail = (instructorId: string) => useQuery({
  queryKey: ['instructor', instructorId],
  queryFn: () => getInstructorDetail(instructorId),
  enabled: !!instructorId,
});

export const useCreateInstructor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInstructor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
};

export const useUpdateInstructor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      instructorId,
      data,
      imageFile,
    }: { instructorId: string; data: Partial<InstructorProfile>; imageFile?: File | null }) => (
      updateInstructor(instructorId, data, imageFile)
    ),
    onSuccess: (_, { instructorId }) => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      queryClient.invalidateQueries({ queryKey: ['instructor', instructorId] });
    },
  });
};

export const useAddCourseToInstructor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instructorId, courseId }: { instructorId: string; courseId: string }) => (
      addCourseToInstructor(instructorId, courseId)
    ),
    onSuccess: (_, { instructorId }) => {
      queryClient.invalidateQueries({ queryKey: ['instructor', instructorId] });
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
};

export const useRemoveCourseFromInstructor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instructorId, courseId }: { instructorId: string; courseId: string }) => (
      removeCourseFromInstructor(instructorId, courseId)
    ),
    onSuccess: (_, { instructorId, courseId }) => {
      // Update the cache directly instead of triggering a GET refetch.
      // After the org admin unlinks their last course for this instructor,
      // a refetch of GET /api/instructors/<id>/ would return 403 (the
      // instructor is no longer in their administered set) and show a
      // spurious "permission denied" error even though the DELETE succeeded.
      queryClient.setQueryData<InstructorDetailResponse>(
        ['instructor', instructorId],
        (old) => {
          if (!old) { return old; }
          return {
            ...old,
            instructor: {
              ...old.instructor,
              courses: (old.instructor.courses ?? []).filter((c) => c.id !== courseId),
            },
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
};

// ── Reverse (course -> instructors) lookup, for the Schedule & Details page ───

export const useCourseInstructors = (courseId: string) => useQuery({
  queryKey: ['courseInstructors', courseId],
  queryFn: () => getInstructorsForCourse(courseId),
  enabled: !!courseId,
});

export const useLinkInstructorToCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, instructorId }: { courseId: string; instructorId: number }) => (
      linkInstructorToCourse(courseId, instructorId)
    ),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['courseInstructors', courseId] });
    },
  });
};

export const useUnlinkInstructorFromCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, instructorId }: { courseId: string; instructorId: number }) => (
      unlinkInstructorFromCourse(courseId, instructorId)
    ),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['courseInstructors', courseId] });
    },
  });
};
