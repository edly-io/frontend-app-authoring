import { Route, Routes } from 'react-router-dom';
import { initializeMocks, render, screen } from '@src/testUtils';
import CalendarTab from './CalendarTab';

const PROGRAM_KEY = 'program-v1:FBR+STP+2026-A';
const COURSE_ID = 'course-v1:FBR+PY101+2026';
const session = {
  id: 5,
  title: 'Python Workshop',
  status: 'scheduled',
  course_id: COURSE_ID,
  course_name: 'Intro to Python',
  scheduled_start_time: '2026-10-20T10:00:00Z',
  scheduled_end_time: '2026-10-20T11:00:00Z',
};

// The deep link that admin notifications and the Home dashboard open.
const renderDeepLink = () => render(
  <Routes>
    <Route path="/programs/:programId/calendar" element={<CalendarTab programId={PROGRAM_KEY} />} />
  </Routes>,
  { routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/calendar?modal=session&id=5`] } },
);

describe('<CalendarTab />', () => {
  beforeEach(() => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(/\/config\//).reply(200, { user_role: 'admin', session_types: [] });
    axiosMock.onGet(/\/calendar-sessions\//).reply(200, { results: [], user_role: 'admin' });
    axiosMock.onGet(/\/program-dates\//).reply(200, { courses: [] });
    axiosMock.onGet(/\/public-holidays\//).reply(200, { count: 0, results: [] });
    axiosMock.onGet(/\/sessions\/5\//).reply(200, session);
    axiosMock.onGet().reply(200, {});
  });

  it('opens the session modal from an admin deep link', async () => {
    renderDeepLink();

    expect(await screen.findByText('Python Workshop')).toBeInTheDocument();
  });

  it("links the modal's roster to the Studio attendance tab for the session's course", async () => {
    renderDeepLink();

    const rosterLink = await screen.findByRole('link', { name: 'View roster →' });
    expect(rosterLink).toHaveAttribute(
      'href',
      `/programs/${PROGRAM_KEY}/attendance/sessions/5?course_id=${encodeURIComponent(COURSE_ID)}`,
    );
  });
});
