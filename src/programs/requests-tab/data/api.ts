import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import {
  cancelSession, getAttendanceApiUrl, getProgramsApiUrl, REQUEST_TYPE, updateSession,
} from '@edly-io/frontend-component-fbr';
import type {
  AdminRequest, AssignSubstituteVariables, BulkApproveResult, Paginated, RequestCounts, RequestListParams,
  RequestType, SubstituteListParams, SubstituteRequest,
} from './types';

const requestsUrl = (type: RequestType, suffix = '') => (
  getAttendanceApiUrl(`requests/${type === REQUEST_TYPE.LEAVE ? 'leave' : 'remote-session'}/${suffix}`)
);
const substituteUrl = (suffix = '') => getAttendanceApiUrl(`substitute-requests/${suffix}`);
// Ids can come from the page URL (`?id=`), so each one stays inside its own path segment.
const idSegment = (id: number | string) => encodeURIComponent(String(id));

/** Only the params that are set, as strings, so empty filters never reach the query string. */
const toSearchParams = (params: object) => new URLSearchParams(
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]),
);

/** One page of a program's requests of one type. */
export const getRequests = async (type: RequestType, params: RequestListParams): Promise<Paginated<AdminRequest>> => {
  const { data } = await getAuthenticatedHttpClient().get(`${requestsUrl(type)}?${toSearchParams(params)}`);
  return data;
};

/** Approve or reject a pending request (or its withdrawal). */
export const reviewRequest = async (
  request: AdminRequest,
  state: string,
  reviewerNote = '',
): Promise<AdminRequest> => {
  const { data } = await getAuthenticatedHttpClient().patch(
    requestsUrl(request.request_type_label, `${idSegment(request.id)}/review/`),
    { state, reviewer_note: reviewerNote },
  );
  return data;
};

export const bulkApproveLeaves = async (programKey: string, leaveIds: string[]): Promise<BulkApproveResult> => {
  const { data } = await getAuthenticatedHttpClient().post(
    getAttendanceApiUrl('requests/leave/bulk-approve/'),
    { program_key: programKey, leave_ids: leaveIds },
  );
  return data;
};

/** Outstanding work per Requests sub-tab: `{ leaves, remote_sessions, substitute_requests }`. */
export const getRequestCounts = async (programKey: string): Promise<RequestCounts> => {
  const params = new URLSearchParams({ program_key: programKey });
  const { data } = await getAuthenticatedHttpClient().get(getAttendanceApiUrl(`requests/counts/?${params}`));
  return data;
};

export const getSubstituteRequests = async (params: SubstituteListParams): Promise<Paginated<SubstituteRequest>> => {
  const { data } = await getAuthenticatedHttpClient().get(`${substituteUrl()}?${toSearchParams(params)}`);
  return data;
};

export const getSubstituteRequest = async (id: number | string): Promise<SubstituteRequest> => {
  const { data } = await getAuthenticatedHttpClient().get(substituteUrl(`${idSegment(id)}/`));
  return data;
};

export const closeSubstituteRequest = async (id: number): Promise<SubstituteRequest> => {
  const { data } = await getAuthenticatedHttpClient().post(substituteUrl(`${idSegment(id)}/close/`));
  return data;
};

/** Puts the new instructors on the session, then records who covers it. */
export const assignSubstitute = async ({
  substituteRequest, sessionData, substituteEmail,
}: AssignSubstituteVariables): Promise<SubstituteRequest> => {
  await updateSession(substituteRequest.session.id, sessionData);
  const { data } = await getAuthenticatedHttpClient().post(
    substituteUrl(`${idSegment(substituteRequest.id)}/assign/`),
    { substitute_instructor_email: substituteEmail },
  );
  return data;
};

/** A session nobody can cover is cancelled, which also closes its substitute request. */
export const cancelCoveredSession = async (substituteRequest: SubstituteRequest): Promise<void> => {
  await cancelSession(substituteRequest.session.id);
  await closeSubstituteRequest(substituteRequest.id);
};

export const updateLeaveThreshold = async (programKey: string, threshold: number) => {
  const { data } = await getAuthenticatedHttpClient().patch(getProgramsApiUrl(`${programKey}/`), { threshold });
  return data;
};
