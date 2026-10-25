// Shared attendance fixtures, shaped like the attendance and programs APIs return them.
import { fireEvent, screen, waitFor } from '@src/testUtils';

export const PROGRAM_KEY = 'program-v1:Org+Test+2026';
export const COURSE_KEY = 'course-v1:Org+CS101+Run';
export const COURSE_LABEL = 'Python Basics Course';

export const CONFIG_URL = /\/attendance\/v1\/config\//;
export const COURSES_URL = /\/fbr\/api\/programs\/.+\/courses\//;
export const LEARNERS_URL = /\/fbr\/api\/programs\/.+\/learners\//;
export const COURSE_SESSIONS_URL = /\/attendance\/v1\/courses\/course-v1.+\/sessions\//;
export const NO_COURSE_SESSIONS_URL = /\/attendance\/v1\/courses\/sessions\//;
export const SETTINGS_URL = /\/attendance\/v1\/settings\/$/;

export const ADMIN_CONFIG = {
  user_role: 'admin', session_types: [], marking_window_days: 7, at_risk_threshold_percent: 75,
};

export const COURSES = [{ course_key: COURSE_KEY, display_name: COURSE_LABEL }];

const HOUR_MS = 3600 * 1000;
export const pastIso = (hours = 1) => new Date(Date.now() - hours * HOUR_MS).toISOString();
export const futureIso = (hours = 1) => new Date(Date.now() + hours * HOUR_MS).toISOString();

/** Opens a SearchableSelect by its label and picks an option. */
export const pickOption = async (label: string, option: string) => {
  const input = await screen.findByLabelText(label);
  fireEvent.focus(input);
  await waitFor(() => expect(screen.getByRole('option', { name: option })).toBeInTheDocument());
  fireEvent.mouseDown(screen.getByRole('option', { name: option }));
};
