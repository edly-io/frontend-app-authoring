import userEvent from '@testing-library/user-event';
import {
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

const enrollment = (n: number) => ({
  username: `learner${n}`,
  email: `learner${n}@example.com`,
  name: `Learner ${n}`,
  enrolled_at: '2026-10-29T10:00:00Z',
  last_activity: null,
  progress_pct: 50,
  completed_units: 5,
  total_units: 10,
  completed_at: null,
  badge_awarded: true,
});

const assignment = (courseProgress) => ({
  username: 'assigned1',
  email: 'assigned1@example.com',
  name: 'Assigned One',
  assigned_at: '2026-10-01T00:00:00Z',
  active: true,
  courses_completed: 1,
  courses_total: 3,
  course_progress: courseProgress,
  complete_at: null,
  kc_score_pct: 90,
  kc_passed: true,
});

let axiosMock;

const selectCourse = async () => {
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
  });

  it('shows no table until a course is picked', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });

    // The page heading carries the subtitle alongside the title.
    expect(await screen.findByRole('heading', { name: /Reporting/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Select a course' })).toBeInTheDocument();
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

  it('distinguishes completed, in-progress, not-started and locked courses', async () => {
    axiosMock.onGet(getCurriculumAssignmentsUrl(curriculumUuid)).reply(200, {
      count: 1,
      results: [assignment([
        {
          course_id: 'course-v1:Uber+1+2026',
          display_name: 'One',
          finished_at: '2026-10-02T00:00:00Z',
          progress_pct: 100,
          status: 'completed',
        },
        {
          course_id: 'course-v1:Uber+2+2026',
          display_name: 'Two',
          finished_at: null,
          progress_pct: 40,
          status: 'in_progress',
        },
        {
          course_id: 'course-v1:Uber+3+2026',
          display_name: 'Three',
          finished_at: null,
          progress_pct: null,
          status: 'locked',
        },
      ])],
    });
    render(<ReportingPage />, { path: '/reporting' });

    await selectCurriculum();

    expect(await screen.findByText('assigned1')).toBeInTheDocument();
    expect(screen.getByText('Completed', { selector: 'span.reporting-badge' })).toBeInTheDocument();
    expect(screen.getByText('In Progress', { selector: 'span.reporting-badge' })).toBeInTheDocument();
    expect(screen.getByText('Locked', { selector: 'span.reporting-badge' })).toBeInTheDocument();
    // The in-progress course shows how far along it is; a locked one shows nothing.
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('shows no curriculum table until one is picked', async () => {
    render(<ReportingPage />, { path: '/reporting' });

    await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));
    expect(await screen.findByRole('option', { name: 'Select a curriculum' })).toBeInTheDocument();
    expect(screen.queryByText('assigned1')).not.toBeInTheDocument();
  });
});
