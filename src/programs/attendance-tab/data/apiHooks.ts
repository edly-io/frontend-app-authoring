import {
  keepPreviousData, useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query';
import { FBR_QUERY_OPTIONS, fbrKeys } from '@edly-io/frontend-component-fbr';
import {
  fetchProgramLearners, getAttendanceRoster, getAttendanceSettings, getCourseSessionsList, getCourseSummary,
  getNoCourseSessionsList, getTraineeAttendance, markAttendance, syncSessionAttendance, updateAttendanceSettings,
} from './api';
import type { AttendanceMark, AttendanceSettings, PageParams } from './types';

// Under the library's 'fbr' root; `attendance` invalidates every roster, history and summary.
export const attendanceKeys = {
  attendance: ['fbr', 'attendance'] as const,
  roster: (sessionId: string) => ['fbr', 'attendance', 'roster', sessionId] as const,
  traineeHistory: (params: object) => ['fbr', 'attendance', 'trainee', params] as const,
  courseSummary: (courseId: string, programKey: string) => ['fbr', 'attendance', 'summary', courseId, programKey] as const,
  courseSessions: (params: object) => ['fbr', 'attendance', 'courseSessions', params] as const,
  settings: ['fbr', 'attendanceSettings'] as const,
  mark: ['fbr', 'attendance', 'mark'] as const,
  learners: (programKey: string) => ['fbr', 'programLearners', programKey] as const,
};

/** A course's sessions, or the program's course-less sessions when `courseKey` is null. */
export const useCourseSessions = (
  courseKey: string | null,
  programKey: string,
  pageParams: PageParams,
  enabled: boolean,
) => (
  useQuery({
    queryKey: attendanceKeys.courseSessions({ courseKey, programKey, ...pageParams }),
    queryFn: () => (courseKey
      ? getCourseSessionsList(courseKey, programKey, pageParams)
      : getNoCourseSessionsList(programKey, pageParams)),
    ...FBR_QUERY_OPTIONS,
    placeholderData: keepPreviousData,
    enabled,
  })
);

export const useAttendanceRoster = (sessionId: string) => useQuery({
  queryKey: attendanceKeys.roster(sessionId),
  queryFn: () => getAttendanceRoster(sessionId),
  ...FBR_QUERY_OPTIONS,
});

export const useTraineeAttendance = (
  userId: number | null,
  params: PageParams & { programKey: string; courseId?: string },
) => useQuery({
  queryKey: attendanceKeys.traineeHistory({ userId, ...params }),
  queryFn: () => getTraineeAttendance(userId as number, params),
  ...FBR_QUERY_OPTIONS,
  placeholderData: keepPreviousData,
  enabled: userId !== null,
});

export const useCourseSummary = (courseId: string, programKey: string) => useQuery({
  queryKey: attendanceKeys.courseSummary(courseId, programKey),
  queryFn: () => getCourseSummary(courseId, programKey),
  ...FBR_QUERY_OPTIONS,
  enabled: Boolean(courseId),
});

export const useAttendanceSettings = () => useQuery({
  queryKey: attendanceKeys.settings,
  queryFn: getAttendanceSettings,
  ...FBR_QUERY_OPTIONS,
});

export const useProgramLearners = (programKey: string) => useQuery({
  queryKey: attendanceKeys.learners(programKey),
  queryFn: () => fetchProgramLearners(programKey),
  ...FBR_QUERY_OPTIONS,
});

const useInvalidateAttendance = () => {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: attendanceKeys.attendance }),
    queryClient.invalidateQueries({ queryKey: fbrKeys.auditLogs }),
  ]);
};

export interface MarkAttendanceVariables {
  sessionId: string;
  records: AttendanceMark[];
}

export const useMarkAttendance = () => {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationKey: attendanceKeys.mark,
    mutationFn: ({ sessionId, records }: MarkAttendanceVariables) => markAttendance(sessionId, records),
    onSuccess: invalidate,
  });
};

export const useSyncSessionAttendance = () => {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: (sessionId: string) => syncSessionAttendance(sessionId),
    onSuccess: invalidate,
  });
};

/** Settings drive at-risk flags and marking windows everywhere, and `/config/` echoes them. */
export const useUpdateAttendanceSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AttendanceSettings>) => updateAttendanceSettings(payload),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: attendanceKeys.settings }),
      queryClient.invalidateQueries({ queryKey: attendanceKeys.attendance }),
      queryClient.invalidateQueries({ queryKey: fbrKeys.config }),
    ]),
  });
};
