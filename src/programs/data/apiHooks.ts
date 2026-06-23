import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import {
  getProgramsConfig,
  getPrograms,
  getProgramDetail,
  createProgram,
  updateProgram,
  getCourses,
  addCourseToProgram,
  getTargetAudiences,
  getCourseTargetAudience,
  updateCourseTargetAudience,
  getPlatformUsers,
  addInstructorToCourse,
  removeInstructorFromCourse,
  enrollLearnerInProgram,
  unenrollLearnerFromProgram,
  removeCourseFromProgram,
  getCourseTeam,
  getProgramEnrollments,
  getBatches,
  getBatchUsers,
  type GetCoursesParams,
  type GetInstructorsParams,
  type GetLearnersParams,
} from './api';
import type { Program } from './types';

export const useProgramsConfig = () => useQuery({
  queryKey: ['programsConfig'],
  queryFn: getProgramsConfig,
});

export const usePrograms = () => useQuery({
  queryKey: ['programs'],
  queryFn: getPrograms,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retry: (failureCount, error: any) => error?.response?.status !== 403 && failureCount < 3,
});

export const useProgramDetail = (programId: string) => useQuery({
  queryKey: ['program', programId],
  queryFn: () => getProgramDetail(programId),
  enabled: !!programId,
});

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      programId,
      data,
      imageFile,
    }: { programId: string; data: Partial<Program>; imageFile?: File | null }) => (
      updateProgram(programId, data, imageFile)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program', programId] });
    },
  });
};

export const useCourses = (params: GetCoursesParams = {}) => useQuery({
  queryKey: ['courses', params.page ?? 1, params.search ?? ''],
  queryFn: () => getCourses(params),
  placeholderData: keepPreviousData,
});

export const useAddCourseToProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId }: { programId: string; courseId: string }) => (
      addCourseToProgram(programId, courseId)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['program', programId] });
    },
  });
};

export const useTargetAudiences = () => useQuery({
  queryKey: ['targetAudiences'],
  queryFn: getTargetAudiences,
});

export const useCourseTargetAudience = (courseId: string) => useQuery({
  queryKey: ['courseTargetAudience', courseId],
  queryFn: () => getCourseTargetAudience(courseId),
  enabled: !!courseId,
});

export const useUpdateCourseTargetAudience = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseKey,
      audienceName,
    }: { courseKey: string; audienceName: string | null }) => (
      updateCourseTargetAudience(courseKey, audienceName)
    ),
    onSuccess: (_, { courseKey }) => {
      queryClient.invalidateQueries({ queryKey: ['courseTargetAudience', courseKey] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};

export const useInstructors = (params: GetInstructorsParams = {}, enabled = true) => useQuery({
  queryKey: ['instructors', params.programKey ?? '', params.page ?? 1, params.search ?? ''],
  queryFn: () => getPlatformUsers({ role: 'instructor', ...params }),
  placeholderData: keepPreviousData,
  staleTime: 0,
  enabled,
});

export const useAddInstructorToCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, username }: { courseId: string; username: string }) => (
      addInstructorToCourse(courseId, username)
    ),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['courseTeam', courseId] });
    },
  });
};

export const useRemoveInstructorFromCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, email }: { courseId: string; email: string }) => (
      removeInstructorFromCourse(courseId, email)
    ),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['courseTeam', courseId] });
    },
  });
};

export const useLearners = (params: GetLearnersParams = {}, enabled = true) => useQuery({
  queryKey: ['learners', params.programKey ?? '', params.page ?? 1, params.search ?? ''],
  queryFn: () => getPlatformUsers({ role: 'learner', ...params }),
  placeholderData: keepPreviousData,
  staleTime: 0,
  enabled,
});

export const useEnrollLearner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, username }: { programId: string; username: string }) => (
      enrollLearnerInProgram(programId, username)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['programEnrollments', programId] });
    },
  });
};

export const useUnenrollLearner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, username }: { programId: string; username: string }) => (
      unenrollLearnerFromProgram(programId, username)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['programEnrollments', programId] });
    },
  });
};

export const useRemoveCourseFromProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId }: { programId: string; courseId: string }) => (
      removeCourseFromProgram(programId, courseId)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['program', programId] });
    },
  });
};

export const useCourseTeam = (courseKey: string, enabled = true) => useQuery({
  queryKey: ['courseTeam', courseKey],
  queryFn: () => getCourseTeam(courseKey),
  staleTime: 0,
  enabled,
});

export const useProgramEnrollments = (programId: string, params: GetLearnersParams = {}) => useQuery({
  queryKey: ['programEnrollments', programId, params.page ?? 1, params.search ?? ''],
  queryFn: () => getProgramEnrollments(programId, params),
  placeholderData: keepPreviousData,
  staleTime: 0,
});

export const useBatches = (enabled = true) => useQuery({
  queryKey: ['batches'],
  queryFn: getBatches,
  staleTime: Infinity,
  enabled,
});

export const useBatchUsers = (batchId: string, enabled = true) => useQuery({
  queryKey: ['batchUsers', batchId],
  queryFn: () => getBatchUsers(batchId),
  staleTime: Infinity,
  enabled,
});
