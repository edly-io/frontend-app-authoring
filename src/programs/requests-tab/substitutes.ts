import { SESSION_STATUS } from '@edly-io/frontend-component-fbr';
import type { SubstituteRequest, SubstituteSession } from './data/types';

export interface Cover {
  email: string;
  name: string;
}

/**
 * A cancelled session needs no cover. The calendar's cancel does not close the request, so a
 * row can outlive its session; the backend refuses to assign against one (`session_cancelled`).
 */
export const isSessionCancelled = (session?: SubstituteSession | null) => session?.status === SESSION_STATUS.CANCELLED;

/**
 * Who covers the session: every current instructor except the one on leave (the assign modal
 * edits the session's roster). Older rows only stored the substitute on the request itself.
 */
export const getCovers = (request: SubstituteRequest): Cover[] => {
  const emails = request.session?.instructor_emails ?? [];
  const names = request.session?.instructor_names ?? [];
  const onLeaveEmail = request.leave_request?.submitter_email;
  const covers = emails
    .map((email, index) => ({ email, name: names[index] || '' }))
    .filter(({ email }) => email && email !== onLeaveEmail);
  if (covers.length === 0 && request.substitute_instructor_email) {
    return [{ email: request.substitute_instructor_email, name: request.substitute_instructor_name || '' }];
  }
  return covers;
};
