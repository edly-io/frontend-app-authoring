import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import {
  getAllCurriculums,
  getCourseCurriculums,
  getCourseEnrollments,
  getCurriculumAssignments,
  getPlatformStats,
  getStaffCourses,
  getUberFlags,
} from './api';

const ROOT = 'reporting';

export const reportingQueryKeys = {
  all: [ROOT],
  uberFlags: ['uberFlags'],
  staffCourses: [ROOT, 'staffCourses'],
  platformStats: (start: string, end: string) => [ROOT, 'platformStats', start, end],
  allCurriculums: [ROOT, 'allCurriculums'],
  enrollments: (courseId: string, page: number, pageSize: number, search: string) => [
    ROOT,
    'enrollments',
    courseId,
    page,
    pageSize,
    search,
  ],
  curriculums: (courseId: string) => [ROOT, 'curriculums', courseId],
  assignments: (curriculumUuid: string, page: number, pageSize: number, search: string) => [
    ROOT,
    'assignments',
    curriculumUuid,
    page,
    pageSize,
    search,
  ],
};

export const useUberFlags = () =>
  useQuery({
    queryKey: reportingQueryKeys.uberFlags,
    queryFn: getUberFlags,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useCourseEnrollments = (
  courseId: string,
  page: number,
  pageSize: number,
  search: string,
) =>
  useQuery({
    queryKey: reportingQueryKeys.enrollments(courseId, page, pageSize, search),
    queryFn: () => getCourseEnrollments(courseId, page, pageSize, search),
    placeholderData: keepPreviousData,
  });

export const useCourseCurriculums = (courseId: string) =>
  useQuery({
    queryKey: reportingQueryKeys.curriculums(courseId),
    queryFn: () => getCourseCurriculums(courseId),
  });

export const useStaffCourses = () =>
  useQuery({
    queryKey: reportingQueryKeys.staffCourses,
    queryFn: getStaffCourses,
    staleTime: 5 * 60 * 1000,
  });

export const useAllCurriculums = () =>
  useQuery({
    queryKey: reportingQueryKeys.allCurriculums,
    queryFn: getAllCurriculums,
    staleTime: 5 * 60 * 1000,
  });

export const useCurriculumAssignments = (
  curriculumUuid: string,
  page: number,
  pageSize: number,
  search: string,
) =>
  useQuery({
    queryKey: reportingQueryKeys.assignments(curriculumUuid, page, pageSize, search),
    queryFn: curriculumUuid
      ? () => getCurriculumAssignments(curriculumUuid, page, pageSize, search)
      : skipToken,
    placeholderData: keepPreviousData,
  });

export const usePlatformStats = (start: string, end: string) =>
  useQuery({
    queryKey: reportingQueryKeys.platformStats(start, end),
    // An empty date means the caller has nothing worth asking about (a backwards range, say).
    // Without the skip the empty pair is just another cache key, and it would be fetched.
    queryFn: start && end ? () => getPlatformStats(start, end) : skipToken,
    // Keeps the previous figures on screen while a new window loads, so the chart does not flash empty.
    placeholderData: keepPreviousData,
  });
