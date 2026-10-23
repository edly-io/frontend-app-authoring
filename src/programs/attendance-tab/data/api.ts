import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getAttendanceApiUrl, getProgramsApiUrl } from '@edly-io/frontend-component-fbr';
import { pathSegment } from '../../data/pathSegment';
import type {
  AttendanceMark, AttendanceSettings, CourseSession, CourseSummaryRow, PageParams, Paginated, ProgramLearner, Roster,
  SyncResult, TraineeAttendanceRow,
} from './types';

const EXPORT_FALLBACK_FILENAME = 'attendance-export.xlsx';
const FILENAME_PATTERN = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;

const pageQuery = ({ page, pageSize }: PageParams) => ({ page: String(page), page_size: String(pageSize) });

/** Every learner enrolled in the program. */
export const fetchProgramLearners = async (programKey: string): Promise<ProgramLearner[]> => {
  const { data } = await getAuthenticatedHttpClient().get(getProgramsApiUrl(`${pathSegment(programKey)}/learners/?no_page`));
  return Array.isArray(data) ? data : (data.results ?? []);
};

/** Upserts manual attendance for one session (admin only). */
export const markAttendance = async (sessionId: string, records: AttendanceMark[]) => {
  const { data } = await getAuthenticatedHttpClient().post(
    getAttendanceApiUrl(`sessions/${pathSegment(sessionId)}/mark-attendance/`),
    { records },
  );
  return data;
};

/** Pulls the Zoom meeting's participants into the session's attendance. Idempotent. */
export const syncSessionAttendance = async (sessionId: string): Promise<SyncResult> => {
  const { data } = await getAuthenticatedHttpClient().post(
    getAttendanceApiUrl(`sessions/${pathSegment(sessionId)}/sync-attendance/`),
  );
  return data;
};

/** Past sessions of a program that belong to no course (seminars, workshops, conferences). */
export const getNoCourseSessionsList = async (
  programKey: string,
  pageParams: PageParams,
): Promise<Paginated<CourseSession>> => {
  const params = new URLSearchParams({ program_key: programKey, ...pageQuery(pageParams) });
  const { data } = await getAuthenticatedHttpClient().get(getAttendanceApiUrl(`courses/sessions/?${params}`));
  return data;
};

/** Past sessions of one course within the program, newest first. */
export const getCourseSessionsList = async (
  courseKey: string,
  programKey: string,
  pageParams: PageParams,
): Promise<Paginated<CourseSession>> => {
  const params = new URLSearchParams({ program_key: programKey, ...pageQuery(pageParams) });
  const { data } = await getAuthenticatedHttpClient().get(
    getAttendanceApiUrl(`courses/${pathSegment(courseKey)}/sessions/?${params}`),
  );
  return data;
};

/** The derived roster of one session: one row per learner, plus the session's marking window. */
export const getAttendanceRoster = async (sessionId: string): Promise<Roster> => {
  const { data } = await getAuthenticatedHttpClient().get(
    getAttendanceApiUrl(`sessions/${pathSegment(sessionId)}/attendance-roster/`),
  );
  return Array.isArray(data) ? { results: data } : data;
};

/** One learner's attendance history; without `courseId`, their sessions that belong to no course. */
export const getTraineeAttendance = async (
  userId: number,
  { programKey, courseId, ...pageParams }: PageParams & { programKey: string; courseId?: string },
): Promise<Paginated<TraineeAttendanceRow>> => {
  const params = new URLSearchParams({ program_key: programKey, ...pageQuery(pageParams) });
  if (courseId) { params.set('course_id', courseId); }
  const { data } = await getAuthenticatedHttpClient().get(
    getAttendanceApiUrl(`trainees/${pathSegment(userId)}/attendance/?${params}`),
  );
  return data;
};

/** Per-learner rollup for a course: one row per enrolled learner. */
export const getCourseSummary = async (courseId: string, programKey: string): Promise<CourseSummaryRow[]> => {
  const params = new URLSearchParams({ program_key: programKey });
  const { data } = await getAuthenticatedHttpClient().get(
    getAttendanceApiUrl(`courses/${pathSegment(courseId)}/attendance-summary/?${params}`),
  );
  return Array.isArray(data) ? data : data.results ?? [];
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/** Downloads the program's full attendance as an XLSX file. */
export const exportProgramAttendance = async (programKey: string): Promise<void> => {
  const response = await getAuthenticatedHttpClient().get(
    getAttendanceApiUrl(`programs/${pathSegment(programKey)}/attendance-export/`),
    { responseType: 'blob' },
  );
  const disposition: string = response.headers?.['content-disposition'] || '';
  const match = disposition.match(FILENAME_PATTERN);
  saveBlob(new Blob([response.data]), match ? match[1].replace(/['"]/g, '') : EXPORT_FALLBACK_FILENAME);
};

/** The global attendance settings (admin only). */
export const getAttendanceSettings = async (): Promise<AttendanceSettings> => {
  const { data } = await getAuthenticatedHttpClient().get(getAttendanceApiUrl('settings/'));
  return data;
};

export const updateAttendanceSettings = async (payload: Partial<AttendanceSettings>): Promise<AttendanceSettings> => {
  const { data } = await getAuthenticatedHttpClient().patch(getAttendanceApiUrl('settings/'), payload);
  return data;
};
