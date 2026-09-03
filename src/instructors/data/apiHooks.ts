import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCourseToInstructor,
  createInstructor,
  getInstructorDetail,
  getInstructors,
  getInstructorsForCourse,
  linkInstructorToCourse,
  removeCourseFromInstructor,
  unlinkInstructorFromCourse,
  updateInstructor,
} from './api';
import type { InstructorProfile } from './types';

export const useInstructors = () => useQuery({
  queryKey: ['instructors'],
  queryFn: getInstructors,
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
    onSuccess: (_, { instructorId }) => {
      queryClient.invalidateQueries({ queryKey: ['instructor', instructorId] });
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
