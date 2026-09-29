/* eslint-disable import/no-extraneous-dependencies */
import { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { CourseRerunActionStatus, getStudioHomeCourses, getStudioHomeLibraries } from './api';

export const studioHomeQueryKeys = {
  all: ['studioHome'],
  /**
   * Base key for list of v1/legacy libraries
   */
  librariesV1: () => [...studioHomeQueryKeys.all, 'librariesV1'],
  /**
   * Base key for a single course's rerun action status
   */
  courseRerunStatus: (courseId: string) => [...studioHomeQueryKeys.all, 'courseRerunStatus', courseId],
};

export const useLibrariesV1Data = (enabled: boolean = true) => (
  useQuery({
    queryKey: studioHomeQueryKeys.librariesV1(),
    queryFn: getStudioHomeLibraries,
    enabled,
  })
);

/**
 * Look up a single course's rerun action status (in progress / failed) by finding it in
 * the `inProcessCourseActions` list returned by the Studio Home API. There is no endpoint
 * to fetch this for a single arbitrary course_key, so we fetch the (already-authenticated,
 * already-scoped-to-the-user) list and find the matching entry client-side.
 *
 * Returns `null` once the course is no longer in that list -- either it never had a rerun
 * in progress, or the rerun just succeeded and the course is now fully available.
 *
 * Polls every 3 seconds (matching `useExportStatus`) while the matched entry is still
 * `isInProgress`, and stops as soon as it isn't.
 */
export const useCourseRerunStatus = (courseId: string, enabled: boolean) => (
  useQuery<CourseRerunActionStatus | null, AxiosError>({
    queryKey: studioHomeQueryKeys.courseRerunStatus(courseId),
    queryFn: async () => {
      // `inProcessCourseActions` is returned by the /home/courses endpoint, not /home.
      const { inProcessCourseActions = [] } = await getStudioHomeCourses('');
      return inProcessCourseActions.find(
        (action: CourseRerunActionStatus) => action.courseKey === courseId,
      ) ?? null;
    },
    enabled,
    retry: false,
    refetchInterval: (query) => (query.state.data?.isInProgress ? 3000 : false),
  })
);
