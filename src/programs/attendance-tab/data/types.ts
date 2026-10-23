export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface PageParams {
  page: number;
  pageSize: number;
}

/** A completed (or in-progress) session in the by-course list. */
export interface CourseSession {
  id: string;
  title?: string;
  session_type?: string;
  scheduled_start_time?: string;
  status?: string;
  marking_window_open?: boolean;
  marking_window_remaining_days?: number | null;
}

/** One learner's row on a session roster. */
export interface RosterRow {
  user_id: number;
  full_name?: string;
  username?: string;
  email?: string;
  status?: string;
  record_id?: number | string | null;
  override_reason?: string | null;
  overridden_by_email?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface RosterSession {
  meeting_id?: string | null;
  marking_window_open?: boolean;
  scheduled_end_time?: string | null;
}

export interface Roster {
  results: RosterRow[];
  session?: RosterSession;
}

/** One session in a learner's attendance history. */
export interface TraineeAttendanceRow {
  session_id?: string;
  session?: string;
  session_title?: string;
  session_date?: string;
  status?: string;
  record_id?: number | string | null;
  user_id: number;
  marking_window_open?: boolean;
  is_overridden?: boolean;
  override_reason?: string | null;
  overridden_by_email?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface CourseSummaryRow {
  user_id?: number;
  full_name?: string;
  email?: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  pending: number;
  attendance_rate?: number;
  is_at_risk?: boolean;
}

export interface AttendanceSettings {
  marking_window_days: number;
  at_risk_threshold_percent: number;
}

export interface ProgramLearner {
  id: number;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface AttendanceMark {
  user_id: number;
  status: string;
  reason?: string;
  notes?: string;
}

export interface SyncResult {
  message?: string;
}
