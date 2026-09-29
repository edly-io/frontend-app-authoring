import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Alert, Button } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import { fetchCourseDetail } from '@src/data/thunks';
import { useCourseRerunStatus } from '@src/studio-home/data/apiHooks';
import { LoadingSpinner } from '../Loading';
import messages from './messages';

interface Props {
  courseId: string;
}

/**
 * Renders in place of the course-authoring shell when the course-detail fetch for
 * `courseId` comes back 404.
 *
 * A 404 here doesn't necessarily mean the course doesn't exist: it may be a course
 * rerun whose destination course is still being created asynchronously (the clone
 * task hasn't materialized it yet -- see EDLYPRODUCT-8393). This component polls the
 * course's rerun action status (the same data Studio Home's "processing courses"
 * list is built from) and handles each case explicitly instead of showing a bare
 * "Not found":
 *
 *  - rerun in progress -> loading state, keep polling.
 *  - rerun just succeeded (the entry disappears from the in-process list, after
 *    having been observed there) -> re-fetch the course detail so the shell picks
 *    up the now-available course.
 *  - rerun failed -> a clear failure message; no further polling.
 *  - the course was never in the in-process list at all (including if the rerun
 *    status check itself fails) -> a genuine 404, so redirect to Studio Home (once
 *    only, to avoid a redirect loop) with a dismissible alert.
 */
const CourseNotFoundHandler = ({ courseId }: Props) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Tracks whether we've ever observed this course as an in-progress rerun, so that
  // the entry later disappearing from the list can be read as "it just succeeded"
  // rather than "it never existed".
  const hasSeenInProgressRef = useRef(false);
  // Guards the redirect-to-home so it only ever fires once per mount.
  const hasRedirectedRef = useRef(false);

  const { data: rerunStatus, isLoading } = useCourseRerunStatus(courseId, true);

  useEffect(() => {
    if (rerunStatus?.isInProgress) {
      hasSeenInProgressRef.current = true;
    }
  }, [rerunStatus]);

  useEffect(() => {
    if (isLoading || hasRedirectedRef.current) {
      return;
    }

    // `rerunStatus` is `null` (no matching entry) or `undefined` (the status check
    // itself errored) once the initial fetch has resolved.
    if (rerunStatus == null) {
      if (hasSeenInProgressRef.current) {
        // The rerun was in progress and has now dropped out of the in-process list:
        // it succeeded. Re-fetch the course detail so the shell picks up the course.
        dispatch(fetchCourseDetail(courseId));
      } else {
        // No rerun was ever in progress for this course key -- a genuine 404.
        hasRedirectedRef.current = true;
        navigate('/home', { state: { courseNotFoundRedirect: true } });
      }
    }
  }, [isLoading, rerunStatus, courseId, dispatch, navigate]);

  if (rerunStatus?.isFailed) {
    return (
      <Alert variant="danger" data-testid="courseRerunFailedAlert">
        <p>{intl.formatMessage(messages.rerunFailedMessage)}</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/home')}>
          {intl.formatMessage(messages.backToStudioHomeButton)}
        </Button>
      </Alert>
    );
  }

  // Covers: checking for the first time, rerun in progress, and the brief instant
  // before either the redirect or the course-detail re-fetch takes effect.
  return (
    <div
      className="d-flex justify-content-center align-items-center flex-column vh-100"
      data-testid="courseRerunLoading"
    >
      <LoadingSpinner />
      <p className="mt-2">{intl.formatMessage(messages.courseBeingCreatedMessage)}</p>
    </div>
  );
};

export default CourseNotFoundHandler;
