import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import { useCurrentFbrProfile } from '@src/fbr-access/apiHooks';
import {
  getProgramsConfig,
  getFbrCities,
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
  getFeedbackForms,
  getFeedbackForm,
  createFeedbackForm,
  getFeedbackRequests,
  getFeedbackRequest,
  initiateFeedbackRequests,
  getFeedbackDashboardComments,
  getFeedbackDashboardInitiations,
  getFeedbackDashboardReport,
  getCertificateConfig,
  updateCertificateConfig,
  uploadCertificateSignature,
  getCertificateRoster,
  awardCertificates,
  revokeCertificate,
  type GetCoursesParams,
  type GetInstructorsParams,
  type GetLearnersParams,
  type PlatformUserRole,
} from './api';
import type {
  CreateFeedbackFormInput,
  FeedbackFiltersState,
  InitiateFeedbackPayload,
  Program,
  CertificateConfig,
  CertificateRosterRow,
} from './types';
import { getProgramCapabilities } from './permissions';

export const useProgramAccess = () => {
  const query = useCurrentFbrProfile();

  return {
    ...query,
    profile: query.data,
    capabilities: getProgramCapabilities(query.data?.roles),
  };
};

export const useFbrCities = (enabled = true) => useQuery({
  queryKey: ['fbrCities'],
  queryFn: getFbrCities,
  staleTime: 10 * 60 * 1000,
  enabled,
});

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

export const useProgramDetail = (programId: string, enabled = true) => useQuery({
  queryKey: ['program', programId],
  queryFn: () => getProgramDetail(programId),
  enabled: !!programId && enabled,
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
  queryKey: [
    'courses',
    params.page ?? 1,
    params.search ?? '',
    params.availableForProgram ?? '',
    params.assignedToOtherProgram ?? '',
  ],
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

const fetchAllPlatformUsersForRole = async (role: PlatformUserRole, programKey: string) => {
  const pageSize = 100;
  const firstPage = await getPlatformUsers({
    role,
    programKey,
    page: 1,
    pageSize,
  });
  if (firstPage.numPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.numPages - 1 }, (_, index) => getPlatformUsers({
      role,
      programKey,
      page: index + 2,
      pageSize,
    })),
  );

  return {
    ...firstPage,
    results: [
      ...firstPage.results,
      ...remainingPages.flatMap((page) => page.results),
    ],
  };
};

export const useInstructors = (params: GetInstructorsParams = {}, enabled = true) => useQuery({
  queryKey: ['instructors', params.programKey ?? '', params.page ?? 1, params.search ?? '', params.pageSize ?? 5],
  queryFn: () => getPlatformUsers({ role: 'instructor', ...params }),
  placeholderData: keepPreviousData,
  staleTime: 0,
  enabled,
});

export const useAllInstructors = (programKey: string, enabled = true) => useQuery({
  queryKey: ['instructors', 'all', programKey],
  queryFn: () => fetchAllPlatformUsersForRole('instructor', programKey),
  enabled: enabled && !!programKey,
  staleTime: 0,
});

export const useAllPlatformUsersForRole = (
  role: PlatformUserRole,
  programKey: string,
  enabled = true,
) => useQuery({
  queryKey: ['platformUsers', 'all', role, programKey],
  queryFn: () => fetchAllPlatformUsersForRole(role, programKey),
  enabled: enabled && !!programKey,
  staleTime: 0,
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
  queryKey: ['learners', params.programKey ?? '', params.page ?? 1, params.search ?? '', params.pageSize ?? 5],
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

export const useFeedbackForms = (programId: string, enabled = true) => useQuery({
  queryKey: ['feedbackForms', programId],
  queryFn: () => getFeedbackForms(programId),
  enabled: enabled && !!programId,
});

export const useFeedbackForm = (programId: string, formId: number | null, enabled = true) => useQuery({
  queryKey: ['feedbackForm', programId, formId],
  queryFn: () => getFeedbackForm(programId, formId!),
  enabled: enabled && !!programId && !!formId,
});

export const useCreateFeedbackForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, input }: { programId: string; input: CreateFeedbackFormInput }) => (
      createFeedbackForm(programId, input)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['feedbackForms', programId] });
    },
  });
};

export const useFeedbackRequests = (
  programId: string,
  filters: FeedbackFiltersState,
  enabled = true,
) => useQuery({
  queryKey: [
    'feedbackRequests',
    programId,
    filters.feedbackName,
    filters.status,
    filters.subject,
    filters.reviewer,
  ],
  queryFn: () => getFeedbackRequests(programId, filters),
  placeholderData: keepPreviousData,
  enabled: enabled && !!programId,
});

export const useFeedbackRequestDetail = (
  programId: string,
  requestId: number | null,
  enabled = true,
) => useQuery({
  queryKey: ['feedbackRequest', programId, requestId],
  queryFn: () => getFeedbackRequest(programId, requestId!),
  enabled: enabled && !!programId && !!requestId,
});

export const useInitiateFeedbackRequests = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, payload }: { programId: string; payload: InitiateFeedbackPayload }) => (
      initiateFeedbackRequests(programId, payload)
    ),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['feedbackRequests', programId] });
      queryClient.invalidateQueries({ queryKey: ['feedbackDashboardInitiations', programId] });
      queryClient.invalidateQueries({ queryKey: ['feedbackDashboardReport', programId] });
    },
  });
};

export const useFeedbackDashboardInitiations = (programId: string, enabled = true) => useQuery({
  queryKey: ['feedbackDashboardInitiations', programId],
  queryFn: () => getFeedbackDashboardInitiations(programId),
  enabled: enabled && !!programId,
});

export const useFeedbackDashboardReport = (
  programId: string,
  initiationId: number | null,
  enabled = true,
) => useQuery({
  queryKey: ['feedbackDashboardReport', programId, initiationId],
  queryFn: () => getFeedbackDashboardReport(programId, initiationId!),
  enabled: enabled && !!programId && !!initiationId,
});

export const useFeedbackDashboardComments = (
  programId: string,
  initiationId: number | null,
  subjectId: string | null,
  enabled = true,
) => useQuery({
  queryKey: ['feedbackDashboardComments', programId, initiationId, subjectId],
  queryFn: () => getFeedbackDashboardComments(programId, initiationId!, subjectId!),
  enabled: enabled && !!programId && !!initiationId && !!subjectId,
});

// ── Program Certificates ──────────────────────────────────────────────────
export const useCertificateConfig = (programId: string, enabled = true) => useQuery({
  queryKey: ['certificateConfig', programId],
  queryFn: () => getCertificateConfig(programId),
  enabled: enabled && !!programId,
});

export const useCertificateRoster = (programId: string, enabled = true) => useQuery({
  queryKey: ['certificateRoster', programId],
  queryFn: () => getCertificateRoster(programId),
  enabled: enabled && !!programId,
});

export const useUpdateCertificateConfig = (programId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: CertificateConfig) => updateCertificateConfig(programId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificateConfig', programId] });
    },
  });
};

export const useUploadCertificateSignature = (programId: string) => useMutation({
  mutationFn: (file: File) => uploadCertificateSignature(programId, file),
});

export const useAwardCertificates = (programId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (usernames: string[]) => awardCertificates(programId, usernames),
    onSuccess: (result, usernames) => {
      // A single-username award unambiguously matches its one result — patch
      // the cache directly so the row updates instantly, no refetch round
      // trip. A bulk award's `ok` list isn't paired with usernames, so it
      // falls back to a refetch.
      if (usernames.length === 1 && result.ok.length === 1) {
        const [username] = usernames;
        const [certificateNumber] = result.ok;
        queryClient.setQueryData<CertificateRosterRow[]>(
          ['certificateRoster', programId],
          (rows) => rows?.map((row) => (row.username === username
            ? { ...row, certificate: { certificateNumber, status: 'active', issuedAt: new Date().toISOString() } }
            : row)),
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['certificateRoster', programId] });
    },
  });
};

export const useRevokeCertificate = (programId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (certificateNumber: string) => revokeCertificate(certificateNumber),
    onSuccess: (_data, certificateNumber) => {
      queryClient.setQueryData<CertificateRosterRow[]>(
        ['certificateRoster', programId],
        (rows) => rows?.map((row) => (row.certificate?.certificateNumber === certificateNumber
          ? { ...row, certificate: null }
          : row)),
      );
    },
  });
};
