import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import { retryUnlessClientError } from '@src/generic/queryErrors';

import {
  getAllCurriculums,
  getAssessmentStats,
  getCourseEnrollments,
  getCurriculumAssignments,
  getStaffCourses,
  getUberFlags,
} from './api';

const ROOT = 'reporting';

export const reportingQueryKeys = {
  all: [ROOT],
  uberFlags: ['uberFlags'],
  staffCourses: [ROOT, 'staffCourses'],
  assessmentStats: [ROOT, 'assessmentStats'],
  allCurriculums: [ROOT, 'allCurriculums'],
  enrollments: (courseId: string, page: number, pageSize: number, search: string) => [
    ROOT,
    'enrollments',
    courseId,
    page,
    pageSize,
    search,
  ],
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
    retry: retryUnlessClientError,
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
    retry: retryUnlessClientError,
  });

export const useStaffCourses = () =>
  useQuery({
    queryKey: reportingQueryKeys.staffCourses,
    queryFn: getStaffCourses,
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessClientError,
  });

export const useAllCurriculums = () =>
  useQuery({
    queryKey: reportingQueryKeys.allCurriculums,
    queryFn: getAllCurriculums,
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessClientError,
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
    retry: retryUnlessClientError,
  });

export const useAssessmentStats = () =>
  useQuery({
    queryKey: reportingQueryKeys.assessmentStats,
    queryFn: getAssessmentStats,
    // The figures move only as learners sit checks, so a tab revisit need not refetch straight away.
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessClientError,
  });
