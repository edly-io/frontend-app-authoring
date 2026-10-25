// Shared request fixtures, shaped like the attendance requests API returns them.
import type { AdminRequest, SubstituteRequest } from './data/types';

export const PROGRAM_KEY = 'program-v1:FBR+STP+2026-A';

export const LEAVE_LIST_URL = /\/requests\/leave\/\?/;
export const REMOTE_LIST_URL = /\/requests\/remote-session\/\?/;
export const COUNTS_URL = /\/requests\/counts\//;
export const LEAVE_USAGE_URL = /\/leave-usage\//;
export const SUBSTITUTES_URL = /\/substitute-requests\/\?/;

export const makeRequest = (overrides: Partial<AdminRequest> = {}): AdminRequest => ({
  id: '1',
  request_type_label: 'leave',
  state: 'PENDING',
  reason: 'Test reason',
  reviewer_note: '',
  created: '2026-06-01T10:00:00Z',
  attachment: null,
  submitter_name: 'Alice',
  submitter_email: 'alice@example.com',
  ...overrides,
});

export const makeSubstituteRequest = (overrides: Partial<SubstituteRequest> = {}): SubstituteRequest => ({
  id: 14,
  status: 'open',
  substitute_instructor_email: '',
  program_key: PROGRAM_KEY,
  leave_request: {
    id: 'abc',
    submitter_email: 'instructor1@fbr.test',
    leave_start_date: '2026-09-02',
    leave_end_date: '2026-09-02',
  },
  session: {
    id: 'sess-1',
    title: 'Course 1 — Session 17',
    scheduled_start_time: '2026-09-02T09:00:00Z',
    status: 'scheduled',
    location: null,
  },
  ...overrides,
});

export const page = <T>(results: T[]) => ({ count: results.length, results });

/** YYYY-MM-DD, `days` from today (local time), as the leave API sends dates. */
export const offsetDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA');
};
