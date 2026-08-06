import { RequestStatus } from '../../data/constants';
import {
  fetchOrganizations,
  updatePostErrors,
  updateLoadingStatuses,
  updateRedirectUrlObj,
  updateCourseRerunData,
  updateSavingStatus,
} from './slice';
import {
  createOrRerunCourse,
  getOrganizations,
  getCourseRerun,
  updateCourseSlug,
} from './api';
import createOrRerunCourseMessages from '../create-or-rerun-course/messages';

export function fetchOrganizationsQuery() {
  return async (dispatch) => {
    try {
      const organizations = await getOrganizations();
      dispatch(fetchOrganizations(organizations));
      dispatch(updateLoadingStatuses({ organizationLoadingStatus: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      dispatch(updateLoadingStatuses({ organizationLoadingStatus: RequestStatus.FAILED }));
    }
  };
}

export function fetchCourseRerunQuery(courseId) {
  return async (dispatch) => {
    try {
      const courseRerun = await getCourseRerun(courseId);
      dispatch(updateCourseRerunData(courseRerun));
      dispatch(updateLoadingStatuses({ courseRerunLoadingStatus: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      dispatch(updateLoadingStatuses({ courseRerunLoadingStatus: RequestStatus.FAILED }));
    }
  };
}

const isSlugConflictError = (error) => {
  try {
    const { customAttributes: { httpErrorResponseData } } = error;
    const parsedData = JSON.parse(httpErrorResponseData);
    return Array.isArray(parsedData?.slug) && parsedData.slug.length > 0;
  } catch (err) {
    return false;
  }
};

export function updateCreateOrRerunCourseQuery(courseData, intl) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));

    // Course creation/rerun goes through core Studio's `course/` endpoint,
    // which knows nothing about this rwaq-specific field — the slug is set
    // via a second, separate call. destinationCourseKey/org+number+run use
    // the same course-v1:org+number+run format for both a new course and a
    // rerun (a rerun keeps org+number, and the user types a new run), so this
    // is reconstructible before the course actually exists.
    const newCourseKey = `course-v1:${courseData.org}+${courseData.number}+${courseData.run}`;

    if (courseData.slug) {
      // Validate/reserve the slug BEFORE creating the course. CourseSlugView.PUT
      // works even though the course doesn't exist yet (by design — see its own
      // docstring), so a duplicate slug can block course creation entirely
      // instead of silently creating the course with its fallback slug.
      try {
        await updateCourseSlug(newCourseKey, courseData.slug);
      } catch (slugError) {
        dispatch(updatePostErrors({
          errMsg: intl.formatMessage(
            isSlugConflictError(slugError)
              ? createOrRerunCourseMessages.slugDuplicateError
              : createOrRerunCourseMessages.slugSaveError,
          ),
        }));
        dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
        return false;
      }
    }

    try {
      const response = await createOrRerunCourse(courseData);
      dispatch(updateRedirectUrlObj('url' in response ? response : {}));
      dispatch(updatePostErrors('errMsg' in response ? response : {}));

      // Rare case: Studio's actual destination key differs from our
      // reconstruction. Re-point the already-reserved slug rather than
      // leaving it attached to the wrong key. Best-effort — the course itself
      // is already created successfully by this point, so a failure here
      // isn't worth blocking on.
      if (
        courseData.slug && !('errMsg' in response)
        && response.destinationCourseKey && response.destinationCourseKey !== newCourseKey
      ) {
        try {
          await updateCourseSlug(response.destinationCourseKey, courseData.slug);
        } catch (slugError) {
          // eslint-disable-next-line no-console
          console.error('Failed to re-point course slug to', response.destinationCourseKey, slugError);
        }
      }

      dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      return true;
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      return false;
    }
  };
}
