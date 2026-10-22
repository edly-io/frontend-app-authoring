import { Route, Routes } from 'react-router-dom';
import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AttendanceRosterPage from './AttendanceRosterPage';
import {
  ADMIN_CONFIG, CONFIG_URL, PROGRAM_KEY, futureIso, pastIso,
} from './testFixtures';

const SESSION_ID = 'session-uuid-1';
const ROSTER_URL = /\/sessions\/session-uuid-1\/attendance-roster\//;
const MARK_URL = /\/sessions\/session-uuid-1\/mark-attendance\/$/;
const SYNC_LABEL = 'Sync attendance from Zoom';

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];
let mockShowToast: jest.Mock;

const trainee = {
  user_id: 11, full_name: 'Tariq Trainee', email: 'tariq@fbr.test', status: 'pending', record_id: null,
};
const mockRoster = (session: object, results: object[] = []) => (
  axiosMock.onGet(ROSTER_URL).reply(200, { results, session })
);
const rosterRequests = () => axiosMock.history.get.filter((req) => ROSTER_URL.test(req.url ?? ''));

const renderRoster = () => render(
  <Routes>
    <Route path="/programs/:programId/attendance/sessions/:sessionId" element={<AttendanceRosterPage programId={PROGRAM_KEY} />} />
  </Routes>,
  { routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/attendance/sessions/${SESSION_ID}`] } },
);

beforeEach(() => {
  const mocks = initializeMocks();
  axiosMock = mocks.axiosMock;
  mockShowToast = mocks.mockShowToast as jest.Mock;
  axiosMock.onGet(CONFIG_URL).reply(200, ADMIN_CONFIG);
});

it('shows the sync button for an ended Zoom session inside the marking window', async () => {
  mockRoster({ meeting_id: '93', marking_window_open: true, scheduled_end_time: pastIso() });
  renderRoster();
  expect(await screen.findByText(/marking window open/i)).toBeInTheDocument();
  expect(await screen.findByText(SYNC_LABEL)).toBeInTheDocument();
});

it('hides the sync button before the session has ended', async () => {
  mockRoster({ meeting_id: '93', marking_window_open: true, scheduled_end_time: futureIso() });
  renderRoster();
  expect(await screen.findByText(/marking window open/i)).toBeInTheDocument();
  expect(screen.queryByText(SYNC_LABEL)).not.toBeInTheDocument();
});

it('hides the sync button once the marking window is closed', async () => {
  mockRoster({ meeting_id: '93', marking_window_open: false, scheduled_end_time: pastIso() });
  renderRoster();
  expect(await screen.findByText(/marking window closed/i)).toBeInTheDocument();
  expect(screen.queryByText(SYNC_LABEL)).not.toBeInTheDocument();
});

it('hides the sync button when the session has no Zoom meeting', async () => {
  mockRoster({ meeting_id: '', marking_window_open: true, scheduled_end_time: pastIso() });
  renderRoster();
  expect(await screen.findByText(/marking window open/i)).toBeInTheDocument();
  expect(screen.queryByText(SYNC_LABEL)).not.toBeInTheDocument();
});

it('marks a trainee present and refetches the roster', async () => {
  mockRoster({ marking_window_open: true, scheduled_end_time: pastIso() }, [trainee]);
  axiosMock.onPost(MARK_URL).reply(200, {});
  renderRoster();
  fireEvent.click(await screen.findByRole('button', { name: 'Present' }));
  await waitFor(() => expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
    records: [{ user_id: 11, status: 'present' }],
  }));
  await waitFor(() => expect(rosterRequests()).toHaveLength(2));
  expect(mockShowToast).toHaveBeenCalledWith('Attendance saved.');
});

it('asks for a reason before changing a recorded status', async () => {
  mockRoster(
    { marking_window_open: true, scheduled_end_time: pastIso() },
    [{ ...trainee, status: 'absent', record_id: 5 }],
  );
  axiosMock.onPost(MARK_URL).reply(200, {});
  renderRoster();
  fireEvent.click(await screen.findByRole('button', { name: 'Present' }));
  fireEvent.change(await screen.findByPlaceholderText('Enter reason…'), { target: { value: 'Arrived late' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
    records: [{ user_id: 11, status: 'present', reason: 'Arrived late' }],
  }));
});
