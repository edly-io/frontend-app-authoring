import { Route, Routes, useLocation } from 'react-router-dom';
import {
  initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AttendanceTab from './AttendanceTab';
import {
  ADMIN_CONFIG, CONFIG_URL, COURSES, COURSES_URL, PROGRAM_KEY, SETTINGS_URL, pastIso,
} from './testFixtures';

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const LocationDisplay = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

// Mounted the way ProgramDetailPage mounts it: under `/programs/:programId/*`.
const renderTab = (path: string) => render(
  <Routes>
    <Route
      path="/programs/:programId/*"
      element={(
        <>
          <AttendanceTab programId={PROGRAM_KEY} />
          <LocationDisplay />
        </>
      )}
    />
  </Routes>,
  { routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/${path}`] } },
);

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(CONFIG_URL).reply(200, ADMIN_CONFIG);
  axiosMock.onGet(SETTINGS_URL).reply(200, { marking_window_days: 7, at_risk_threshold_percent: 75 });
  axiosMock.onGet(COURSES_URL).reply(200, COURSES);
});

describe('<AttendanceTab />', () => {
  it('redirects /attendance to the dashboard', async () => {
    renderTab('attendance');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/programs/${PROGRAM_KEY}/attendance/dashboard`));
    expect(await screen.findByText('Attendance Dashboard')).toBeInTheDocument();
  });

  it('renders the roster for the session in the URL', async () => {
    axiosMock.onGet(/\/sessions\/5\/attendance-roster\//).reply(200, {
      results: [], session: { marking_window_open: true, scheduled_end_time: pastIso() },
    });
    renderTab('attendance/sessions/5?course_id=course-v1:X');
    expect(await screen.findByText(/marking window open/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sessions/i })).toHaveAttribute(
      'href',
      `/programs/${PROGRAM_KEY}/attendance/by-course?course_id=course-v1%3AX`,
    );
  });

  it('shows a 403 on the roster as an error Alert', async () => {
    axiosMock.onGet(/\/sessions\/5\/attendance-roster\//).reply(403, { detail: 'You do not have permission to perform this action.' });
    renderTab('attendance/sessions/5');
    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
  });

  it('shows the audit log toggle', async () => {
    renderTab('attendance/dashboard');
    expect(await screen.findByRole('button', { name: /^audit log$/i })).toBeInTheDocument();
  });
});
