import { API_ERROR_TYPES } from '../constants';

export const getErrorDetails = (error, dismissible = true) => {
  const errorInfo = { dismissible };
  const { data } = error.response ?? {};
  if (error.response?.status === 403) {
    // For 403 status the error shouldn't be dismissible
    errorInfo.dismissible = false;
    errorInfo.type = API_ERROR_TYPES.forbidden;
    errorInfo.status = error.response.status;
  } else if (data?.error_code === 'course_does_not_exist') {
    // The course has no CourseOverview yet, which typically means it is still
    // being processed in the background (e.g. a rerun or import that hasn't
    // finished). Surface an informative, non-dismissible message rather than
    // the generic "servers encountered an error" alert.
    errorInfo.dismissible = false;
    errorInfo.type = API_ERROR_TYPES.courseNotReady;
    errorInfo.status = error.response.status;
  } else if (error.response?.data) {
    if ((typeof data === 'string' && !data.includes('</html>')) || typeof data === 'object') {
      errorInfo.data = JSON.stringify(data);
    }
    errorInfo.status = error.response.status;
    errorInfo.type = API_ERROR_TYPES.serverError;
  } else if (error.request) {
    errorInfo.type = API_ERROR_TYPES.networkError;
  } else {
    errorInfo.type = API_ERROR_TYPES.unknown;
    errorInfo.data = error.message;
  }
  return errorInfo;
};
