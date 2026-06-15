import React from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Icon,
  Row,
  Pagination,
  Alert,
  Button,
} from '@openedx/paragon';
import { Error } from '@openedx/paragon/icons';

import { COURSE_CREATOR_STATES } from '@src/constants';
import { useBulkCourseAggregateStates } from '@src/course-lifecycle/data/apiHooks';
import type { LifecycleState } from '@src/course-lifecycle/data/types';
import { getStudioHomeData, getStudioHomeCoursesParams } from '@src/studio-home/data/selectors';
import { resetStudioHomeCoursesCustomParams, updateStudioHomeCoursesCustomParams } from '@src/studio-home/data/slice';
import { fetchStudioHomeData } from '@src/studio-home/data/thunks';
import CardItem from '@src/studio-home/card-item';
import CollapsibleStateWithAction from '@src/studio-home/collapsible-state-with-action';
import ProcessingCourses from '@src/studio-home/processing-courses';
import { LoadingSpinner } from '@src/generic/Loading';
import AlertMessage from '@src/generic/alert-message';
import messages from '../messages';
import CoursesFilters from './courses-filters';
import ContactAdministrator from './contact-administrator';
import './index.scss';

interface Props {
  coursesDataItems: {
    courseKey: string;
    displayName: string;
    lmsLink: string | null;
    number: string;
    org: string;
    rerunLink: string | null;
    run: string;
    url: string;
  }[];
  showNewCourseContainer: boolean;
  onClickNewCourse: () => void;
  isShowProcessing: boolean;
  isLoading: boolean;
  isFailed: boolean;
  numPages: number;
  coursesCount: number;
}

const CoursesTab: React.FC<Props> = ({
  coursesDataItems,
  showNewCourseContainer,
  onClickNewCourse,
  isShowProcessing,
  isLoading,
  isFailed,
  numPages = 0,
  coursesCount = 0,
}) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const location = useLocation();
  const {
    courseCreatorStatus,
    optimizationEnabled,
  } = useSelector(getStudioHomeData);
  const studioHomeCoursesParams = useSelector(getStudioHomeCoursesParams);
  const { currentPage, isFiltered, lifecycleFilter } = studioHomeCoursesParams;

  const courseKeys = coursesDataItems?.map((c) => c.courseKey) ?? [];
  const {
    data: bulkLifecycleStates = {},
    isLoading: isLifecycleLoading,
    isAccessPending: isLifecycleAccessPending,
    isAccessDenied: isLifecycleAccessDenied,
  } = useBulkCourseAggregateStates(courseKeys);
  const canAccessLifecycle = !isLifecycleAccessPending && !isLifecycleAccessDenied;
  const hasAbilityToCreateCourse = courseCreatorStatus === COURSE_CREATOR_STATES.granted;
  const showCollapsible = [
    COURSE_CREATOR_STATES.denied,
    COURSE_CREATOR_STATES.pending,
    COURSE_CREATOR_STATES.unrequested,
  ].includes(courseCreatorStatus as any);
  const locationValue = location.search ?? '';

  const handlePageSelected = (page) => {
    const {
      search,
      order,
      archivedOnly,
      activeOnly,
    } = studioHomeCoursesParams;

    const customParams = {
      search,
      order,
      archivedOnly,
      activeOnly,
    };

    dispatch(fetchStudioHomeData(locationValue, false, { page, ...customParams }));
    dispatch(updateStudioHomeCoursesCustomParams({ currentPage: page, isFiltered: true }));
  };

  const handleCleanFilters = () => {
    dispatch(resetStudioHomeCoursesCustomParams());
    dispatch(fetchStudioHomeData(locationValue, false, { page: 1, order: 'display_name' }));
  };

  const isNotFilteringCourses = !isFiltered && !isLoading;
  const hasCourses = coursesDataItems?.length > 0;
  const activeLifecycleFilter = canAccessLifecycle ? lifecycleFilter : undefined;
  const visibleCoursesCount = activeLifecycleFilter
    ? (coursesDataItems?.filter(({ courseKey }) => bulkLifecycleStates[courseKey] === lifecycleFilter).length ?? 0)
    : (coursesDataItems?.length ?? 0);
  const hasVisibleCourses = visibleCoursesCount > 0;

  if (isLoading && !isFiltered) {
    return (
      <Row className="m-0 mt-4 justify-content-center">
        <LoadingSpinner />
      </Row>
    );
  }

  return (
    isFailed && !isFiltered ? (
      <AlertMessage
        variant="danger"
        description={(
          <Row className="m-0 align-items-center">
            <Icon src={Error} className="text-danger-500 mr-1" />
            <span data-testid="error-failed-message">{intl.formatMessage(messages.courseTabErrorMessage)}</span>
          </Row>
        )}
      />
    ) : (
      <div className="courses-tab-container">
        <div className="d-flex flex-row align-items-center justify-content-between my-4">
          {isShowProcessing && <ProcessingCourses />}
          <CoursesFilters
            dispatch={dispatch}
            locationValue={locationValue}
            isLoading={isLoading}
            showLifecycleFilter={canAccessLifecycle}
          />
          <p data-testid="pagination-info" className="my-0">
            {intl.formatMessage(messages.coursesPaginationInfo, {
              length: coursesDataItems.length,
              total: coursesCount,
            })}
          </p>
        </div>
        {hasCourses ? (
          <>
            {coursesDataItems.map(
              ({
                courseKey,
                displayName,
                lmsLink,
                org,
                rerunLink,
                number,
                run,
                url,
              }) => (
                <CardItem
                  key={courseKey}
                  courseKey={courseKey}
                  displayName={displayName}
                  lmsLink={lmsLink}
                  rerunLink={rerunLink}
                  org={org}
                  number={number}
                  run={run}
                  url={url}
                  lifecycleState={canAccessLifecycle
                    ? bulkLifecycleStates[courseKey] as LifecycleState
                    : undefined}
                  lifecycleFilter={activeLifecycleFilter}
                />
              ),
            )}

            {numPages > 1 && (
              <Pagination
                className="d-flex justify-content-center"
                paginationLabel="pagination navigation"
                pageCount={numPages}
                currentPage={currentPage}
                onPageSelect={handlePageSelected}
              />
            )}
          </>
        ) : (!optimizationEnabled && isNotFilteringCourses && (
          <ContactAdministrator
            hasAbilityToCreateCourse={hasAbilityToCreateCourse}
            showNewCourseContainer={showNewCourseContainer}
            onClickNewCourse={onClickNewCourse}
          />
        )
        )}

        {isFiltered && !hasVisibleCourses && !isLoading && !isLifecycleLoading && (
          <Alert className="mt-4">
            <Alert.Heading>
              {intl.formatMessage(messages.coursesTabCourseNotFoundAlertTitle)}
            </Alert.Heading>
            <p data-testid="courses-not-found-alert">
              {intl.formatMessage(messages.coursesTabCourseNotFoundAlertMessage)}
            </p>
            <Button variant="primary" onClick={handleCleanFilters}>
              {intl.formatMessage(messages.coursesTabCourseNotFoundAlertCleanFiltersButton)}
            </Button>
          </Alert>
        )}
        {showCollapsible && (
          <CollapsibleStateWithAction
            state={courseCreatorStatus!}
            className="mt-3"
          />
        )}
      </div>
    )
  );
};

export default CoursesTab;
