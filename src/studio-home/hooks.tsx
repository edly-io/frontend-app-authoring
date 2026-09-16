import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { RequestStatus } from '../data/constants';
import { COURSE_CREATOR_STATES } from '../constants';
import { getCourseData, getSavingStatus } from '../generic/data/selectors';
import { fetchStudioHomeData } from './data/thunks';
import {
  getLoadingStatuses,
  getSavingStatuses,
  getStudioHomeData,
  getStudioHomeCoursesParams,
} from './data/selectors';
import { updateSavingStatuses } from './data/slice';

/**
 * The creation forms rendered inline on the Studio home page. Only one of them may
 * be open at a time, so they are tracked as a single value rather than as one
 * boolean per form (which would allow the invalid "all three open" state).
 */
export type CreationFormName = 'course' | 'program' | 'instructor';

const useStudioHome = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams(); // The query string (location.search)
  const studioHomeData = useSelector(getStudioHomeData);
  const studioHomeCoursesParams = useSelector(getStudioHomeCoursesParams);
  const { isFiltered } = studioHomeCoursesParams;
  const newCourseData = useSelector(getCourseData);
  const { studioHomeLoadingStatus } = useSelector(getLoadingStatuses);
  const savingCreateRerunStatus = useSelector(getSavingStatus);
  const {
    courseCreatorSavingStatus,
    deleteNotificationSavingStatus,
  } = useSelector(getSavingStatuses);
  const [activeCreationForm, setActiveCreationForm] = useState<CreationFormName | null>(null);
  const openCreationForm = useCallback((form: CreationFormName) => setActiveCreationForm(form), []);
  const closeCreationForm = useCallback(() => setActiveCreationForm(null), []);
  const showNewCourseContainer = activeCreationForm === 'course';
  const showNewProgramContainer = activeCreationForm === 'program';
  const showNewInstructorContainer = activeCreationForm === 'instructor';
  const isLoadingPage = studioHomeLoadingStatus === RequestStatus.IN_PROGRESS;
  const isFailedLoadingPage = studioHomeLoadingStatus === RequestStatus.FAILED;

  // FIXME: data should be loaded with React Query, not useEffect().
  // To avoid a bug where changes in the "search all courses" query would trigger a reload,
  // we need to remove the search 'q' from 'searchParams' and just limit this to the search
  // parameters like 'active_only' that affect the course list. But really we need to replace
  // fetchStudioHomeData() with separate React Query hooks - see docstring on that method.
  // TODO: this whole thing is a bit weird; we sort of read the params from the search query,
  // so if you enter the URL /home?archived_only=true it only shows archived courses, but the
  // UI filters won't match it, and when you change the filters it doesn't update the search query.
  // We should either use the search query as the only state / source of truth or ignore it entirely.
  const courseListQuery = new URLSearchParams();
  for (const key of ['org', 'search', 'order', 'active_only', 'archived_only', 'page']) {
    // istanbul ignore if: this functionality is only partially implemented - see above
    if (searchParams.has(key)) {
      courseListQuery.set(key, searchParams.get(key)!);
    }
  }
  // Deliberately not `courseListQuery.size`: that getter is absent in jsdom, so under test this
  // expression pinned to '' forever and the effect below could never re-fire. Serialising once and
  // testing the string is equivalent in the browser and actually observable in tests.
  const courseListQueryParams = courseListQuery.toString();
  const courseListQueryString = courseListQueryParams ? `?${courseListQueryParams}` : '';
  useEffect(() => {
    dispatch(fetchStudioHomeData(courseListQueryString));
    // Changing the course list filters reloads the courses behind the "new course" form,
    // so close it. The other creation forms are unrelated to that query and stay open.
    setActiveCreationForm((current) => (current === 'course' ? null : current));
  }, [courseListQueryString]);

  useEffect(() => {
    const firstPage = 1;
    dispatch(fetchStudioHomeData(courseListQueryString, false, { page: firstPage, order: 'display_name' }));
  }, []);

  useEffect(() => {
    if (courseCreatorSavingStatus === RequestStatus.SUCCESSFUL) {
      dispatch(updateSavingStatuses({ courseCreatorSavingStatus: '' }));
      dispatch(fetchStudioHomeData());
    }
  }, [courseCreatorSavingStatus]);

  useEffect(() => {
    if (deleteNotificationSavingStatus === RequestStatus.SUCCESSFUL) {
      dispatch(updateSavingStatuses({ courseCreatorSavingStatus: '' }));
      dispatch(fetchStudioHomeData());
    } else if (deleteNotificationSavingStatus === RequestStatus.FAILED) {
      dispatch(updateSavingStatuses({ deleteNotificationSavingStatus: '' }));
    }
  }, [deleteNotificationSavingStatus]);

  const {
    allowCourseReruns,
    rerunCreatorStatus,
    optimizationEnabled,
    studioRequestEmail,
    inProcessCourseActions,
    courseCreatorStatus,
    librariesV1Enabled,
    librariesV2Enabled,
  } = studioHomeData;

  const isShowOrganizationDropdown = optimizationEnabled && courseCreatorStatus === COURSE_CREATOR_STATES.granted;
  const isShowEmailStaff = courseCreatorStatus === COURSE_CREATOR_STATES.disallowedForThisSite && !!studioRequestEmail;
  const isShowProcessing = allowCourseReruns && rerunCreatorStatus && inProcessCourseActions?.length > 0;
  const hasAbilityToCreateNewCourse = courseCreatorStatus === COURSE_CREATOR_STATES.granted;
  const anyQueryIsPending = [deleteNotificationSavingStatus, courseCreatorSavingStatus, savingCreateRerunStatus]
    .includes(RequestStatus.PENDING);
  const anyQueryIsFailed = [deleteNotificationSavingStatus, courseCreatorSavingStatus, savingCreateRerunStatus]
    .includes(RequestStatus.FAILED);

  return {
    isLoadingPage,
    isFailedLoadingPage,
    newCourseData,
    studioHomeData,
    isShowProcessing,
    anyQueryIsFailed,
    isShowEmailStaff,
    anyQueryIsPending,
    showNewCourseContainer,
    showNewProgramContainer,
    showNewInstructorContainer,
    courseCreatorSavingStatus,
    isShowOrganizationDropdown,
    hasAbilityToCreateNewCourse,
    isFiltered,
    openCreationForm,
    closeCreationForm,
    librariesV1Enabled,
    librariesV2Enabled,
  };
};

export { useStudioHome };
