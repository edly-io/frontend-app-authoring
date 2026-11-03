import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import { retryUnlessClientError } from '@src/course-categories/utils';

import {
  getAllCurriculums,
  getCourseEnrollments,
  getCurriculumAssignments,
  getStaffCourses,
  getUberFlags,
} from './api';

const ROOT = 'reporting';

export const reportingQueryKeys = {
  uberFlags: ['uberFlags'],
  staffCourses: [ROOT, 'staffCourses'],
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
    retry: retryUnlessClientError,
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
    retry: retryUnlessClientError,
    queryFn: () => getCourseEnrollments(courseId, page, pageSize, search),
    placeholderData: keepPreviousData,
  });

export const useStaffCourses = () =>
  useQuery({
    queryKey: reportingQueryKeys.staffCourses,
    retry: retryUnlessClientError,
    queryFn: getStaffCourses,
    staleTime: 5 * 60 * 1000,
  });

export const useAllCurriculums = () =>
  useQuery({
    queryKey: reportingQueryKeys.allCurriculums,
    retry: retryUnlessClientError,
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
    retry: retryUnlessClientError,
    queryFn: curriculumUuid
      ? () => getCurriculumAssignments(curriculumUuid, page, pageSize, search)
      : skipToken,
    placeholderData: keepPreviousData,
  });
