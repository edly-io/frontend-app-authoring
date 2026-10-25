import type { REQUEST_TYPE } from '@edly-io/frontend-component-fbr';

export type RequestType = typeof REQUEST_TYPE[keyof typeof REQUEST_TYPE];

export interface RequestSessionSummary {
  id: number | string;
  title?: string;
  scheduled_start_time?: string;
}

/** A leave or remote-session request as the admin list returns it. */
export interface AdminRequest {
  id: string;
  request_type_label: RequestType;
  state: string;
  reason?: string;
  reviewer_note?: string;
  created?: string;
  attachment?: string | null;
  submitter_name?: string;
  submitter_email?: string;
  submitter_role?: string;
  leave_type?: string;
  leave_start_date?: string;
  leave_end_date?: string;
  category?: string;
  sessions?: RequestSessionSummary[];
  would_exceed_threshold?: boolean;
  has_session_conflict?: boolean;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface RequestFilters {
  state?: string;
  q?: string;
  start_date?: string;
  end_date?: string;
}

export interface RequestListParams extends RequestFilters {
  program_key: string;
  page: number;
  page_size: number;
}

export interface ReviewVariables {
  request: AdminRequest;
  state: string;
  reviewerNote?: string;
}

export interface BulkApproveResult {
  approved_count: number;
  ignored_count: number;
}

export interface RequestCounts {
  leaves: number;
  remote_sessions: number;
  substitute_requests: number;
}

export interface SubstituteSession {
  id: number | string;
  title?: string;
  status?: string;
  session_type?: string;
  scheduled_start_time?: string;
  course_id?: string;
  course_name?: string;
  location?: { name?: string } | null;
  instructor_emails?: string[];
  instructor_names?: string[];
}

export interface SubstituteLeaveRequest {
  id: string;
  submitter_name?: string;
  submitter_email?: string;
  leave_start_date?: string;
  leave_end_date?: string;
}

export interface SubstituteRequest {
  id: number;
  status: string;
  program_key?: string;
  substitute_instructor_email?: string;
  substitute_instructor_name?: string;
  leave_request: SubstituteLeaveRequest;
  session: SubstituteSession;
}

export interface SubstituteFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface SubstituteListParams extends SubstituteFilters {
  program_key: string;
  page: number;
  page_size: number;
}

export interface AssignSubstituteVariables {
  substituteRequest: SubstituteRequest;
  sessionData: Record<string, unknown>;
  substituteEmail: string;
}

export interface LeaveUsageRow {
  user_id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  total_leaves_availed: number;
  breakdown?: { full_day_leaves?: number; session_specific_leaves?: number };
}

export interface LeaveUsage {
  program_key?: string;
  threshold: number;
  leaves: LeaveUsageRow[];
}
