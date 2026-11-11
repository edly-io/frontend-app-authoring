import userEvent from '@testing-library/user-event';
import {
  fireEvent,
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import ReportingPage from './ReportingPage';
import {
  getAllCurriculumsUrl,
  getCourseEnrollmentsUrl,
  getCurriculumAssignmentsUrl,
  getPlatformStatsUrl,
  getStaffCoursesUrl,
  getUberFlagsUrl,
} from './data/api';

// The page shell (Studio header, home tab bar, footer) is covered by its own tests; stub it out so
// these tests only exercise the reporting tabs.
jest.mock('../header', () =>
  function MockHeader() {
    return <div />;
  });
jest.mock('../curriculum-management/StudioHomeNav', () =>
  function MockNav() {
    return <div />;
  });
jest.mock('@edx/frontend-component-footer', () => ({
  StudioFooterSlot: () => <div />,
}));

const courseId = 'course-v1:Uber+101+2026';
const curriculumUuid = 'abc-123';

const enrollment = (n: number, badge = { badge_awarded: true, badge_configured: true }) => ({
  username: `learner${n}`,
  email: `learner${n}@example.com`,
  name: `Learner ${n}`,
  enrolled_at: '2026-10-29T10:00:00Z',
  last_activity: null,
  progress_pct: 50,
  completed_units: 5,
  total_units: 10,
  completed_at: null,
  ...badge,
});

const assignment = () => ({
  username: 'assigned1',
  email: 'assigned1@example.com',
  name: 'Assigned One',
  assigned_at: '2026-10-01T00:00:00Z',
  active: true,
  courses_completed: 1,
  courses_total: 3,
  complete_at: null,
  complete_badge_awarded_at: null,
  complete_badge_configured: false,
  retained_at: null,
  retained_badge_awarded_at: null,
  retained_badge_configured: false,
  kc_score_pct: 90,
  kc_passed: true,
});

let axiosMock;

const stats = (exposed: number, completers: number, ratePct: number | null) => ({
  start: '2026-10-01T00:00:00Z',
  end: '2026-10-31T23:59:59Z',
  voluntary_learning: {
    exposed_learners: exposed,
    voluntary_completers: completers,
    rate_pct: ratePct,
  },
});

const selectCourse = async () => {
  // Overview is the landing tab, so the course selector only exists once Courses is open.
  await userEvent.click(await screen.findByRole('tab', { name: 'Courses' }));
  // Wait for the staff-course list to arrive before the option can be picked.
  await screen.findByRole('option', { name: 'Uber 101' });
  await userEvent.selectOptions(screen.getByLabelText('Course'), courseId);
};

const selectCurriculum = async () => {
  await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));
  await screen.findByRole('option', { name: 'Onboarding' });
  await userEvent.selectOptions(screen.getByLabelText('Curriculum'), curriculumUuid);
};

describe('<ReportingPage />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onGet(getUberFlagsUrl()).reply(200, { enable_reporting: true });
    axiosMock.onGet(getStaffCoursesUrl()).reply(200, [{ course_id: courseId, display_name: 'Uber 101' }]);
    axiosMock.onGet(getAllCurriculumsUrl()).reply(200, [{ uuid: curriculumUuid, title: 'Onboarding' }]);
    axiosMock.onGet(getPlatformStatsUrl()).reply(200, stats(200, 50, 25));
  });

  it('shows no table until a course is picked', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });

    // The page heading carries the subtitle alongside the title.
    expect(await screen.findByRole('heading', { name: /Reporting/ })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('tab', { name: 'Courses' }));
    expect(await screen.findByRole('option', { name: 'Select a course' })).toBeInTheDocument();
    expect(screen.queryByText('learner1')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download CSV/ })).not.toBeInTheDocument();
  });

  it('shows enrollment data and the CSV link once a course is picked', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText('learner1')).toBeInTheDocument();
    expect(screen.getByText('learner1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Oct 29, 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download CSV/ })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 0, results: [] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText('No learners are enrolled in this course yet.')).toBeInTheDocument();
  });

  it('shows an alert on error', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(500);
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
  });

  it('tells a course-staff user what a 403 means instead of asking them to retry', async () => {
    // Curriculum reports are global-staff only, so retrying will never succeed here.
    axiosMock.onGet(getCurriculumAssignmentsUrl(curriculumUuid)).reply(403);
    render(<ReportingPage />, { path: '/reporting' });
    await selectCurriculum();

    expect(await screen.findByText(/global staff access/)).toBeInTheDocument();
    expect(screen.queryByText(/Please try again/)).not.toBeInTheDocument();
  });

  it('searches server-side', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();
    await screen.findByText('learner1');

    await userEvent.type(screen.getByRole('searchbox'), 'zed{enter}');
    await waitFor(() => {
      expect(axiosMock.history.get.some(r => r.params?.search === 'zed' && r.params?.page === 1)).toBe(true);
    });
  });

  it('paginates', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 60, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();
    await screen.findByText('learner1');

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(axiosMock.history.get.some(r => r.params?.page === 2)).toBe(true);
    });
  });

  it('shows a course badge as awarded, not awarded or absent', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, {
      count: 3,
      results: [
        enrollment(1, { badge_awarded: true, badge_configured: true }),
        enrollment(2, { badge_awarded: false, badge_configured: true }),
        // No badge is linked to this course at all, so there is nothing for anyone to earn.
        enrollment(3, { badge_awarded: false, badge_configured: false }),
      ],
    });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText('learner1')).toBeInTheDocument();
    expect(screen.getByText('Awarded', { selector: 'span.reporting-badge' })).toBeInTheDocument();
    expect(screen.getByText('Not Awarded', { selector: 'span.reporting-badge' })).toBeInTheDocument();
    expect(screen.getByText('No Badge', { selector: 'span.reporting-badge' })).toBeInTheDocument();
  });

  it('falls back to the two-state read when the backend sends no badge_configured', async () => {
    // A server that predates the field must not turn an earned badge into "No Badge".
    const { badge_configured: _omitted, ...withoutField } = enrollment(1);
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [withoutField] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText('learner1')).toBeInTheDocument();
    expect(screen.getByText('Awarded', { selector: 'span.reporting-badge' })).toBeInTheDocument();
    expect(screen.queryByText('No Badge')).not.toBeInTheDocument();
  });

  it('shows curriculum slot badges, and marks an empty slot as having no badge', async () => {
    const row = assignment();
    axiosMock.onGet(getCurriculumAssignmentsUrl(curriculumUuid)).reply(200, {
      count: 1,
      results: [{
        ...row,
        complete_badge_awarded_at: '2026-10-20T00:00:00Z',
        complete_badge_configured: true,
        // The Retained slot is empty, so it reads as "No Badge" rather than as a missed milestone.
        retained_badge_configured: false,
      }],
    });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCurriculum();

    expect(await screen.findByText('assigned1')).toBeInTheDocument();
    expect(screen.getByText('No Badge', { selector: 'span.reporting-badge' })).toBeInTheDocument();
  });

  it('opens on the overview and charts the voluntary learning rate', async () => {
    render(<ReportingPage />, { path: '/reporting' });

    expect(await screen.findByRole('heading', { name: 'Meaningful voluntary learning rate' })).toBeInTheDocument();
    expect(await screen.findByText('25%')).toBeInTheDocument();
    // The chart carries the figures for screen readers, not just the wedge.
    expect(screen.getByRole('img', {
      name: '25% of 200 eligible exposed learners completed a non-mandatory course: 50 of them.',
    })).toBeInTheDocument();
    // The remainder is derived, so it is worth asserting rather than trusting.
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('says the rate is undefined rather than 0% when nobody was exposed', async () => {
    axiosMock.onGet(getPlatformStatsUrl()).reply(200, stats(0, 0, null));
    render(<ReportingPage />, { path: '/reporting' });

    expect(await screen.findByText(/No learner had a non-mandatory course open to them/)).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('asks the backend for the dates the filter is set to', async () => {
    render(<ReportingPage />, { path: '/reporting' });
    await screen.findByText('25%');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });

    await waitFor(() => {
      expect(axiosMock.history.get.some(r => r.params?.start === '2026-10-01')).toBe(true);
    });
  });

  it('refuses a backwards range without asking the backend', async () => {
    render(<ReportingPage />, { path: '/reporting' });
    await screen.findByText('25%');
    const statsCalls = () => axiosMock.history.get.filter(r => r.url === getPlatformStatsUrl()).length;
    const before = statsCalls();

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2020-01-01' } });

    expect(await screen.findByText('The start date must not be after the end date.')).toBeInTheDocument();
    expect(statsCalls()).toBe(before);
  });

  it('shows no curriculum table until one is picked', async () => {
    render(<ReportingPage />, { path: '/reporting' });

    await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));
    expect(await screen.findByRole('option', { name: 'Select a curriculum' })).toBeInTheDocument();
    expect(screen.queryByText('assigned1')).not.toBeInTheDocument();
  });
});
