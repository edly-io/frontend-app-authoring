import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import ReportingPage from './ReportingPage';
import {
  getAllCurriculumsUrl,
  getAssessmentStatsUrl,
  getCourseEnrollmentsCsvUrl,
  getCourseEnrollmentsUrl,
  getCurriculumAssignmentsCsvUrl,
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

const summary = (over = {}) => ({
  counted: 0,
  learners: 0,
  avg_pre_pct: null,
  avg_post_pct: null,
  gain_pct: null,
  ...over,
});

const outcome = (over = {}) => ({ attempted: 0, passed: 0, failed: 0, pass_rate_pct: null, ...over });

const emptyStats = {
  courses: { totals: { ...summary(), ...outcome() }, rows: [] },
  retention: { totals: { counted: 0, ...outcome() }, rows: [] },
  curriculum_retention: {
    totals: { counted: 0, ...outcome() },
    completion: { counted: 0, ...outcome() },
    rows: [],
  },
};

let axiosMock;

const openCoursesTab = async () => {
  await userEvent.click(await screen.findByRole('tab', { name: 'Courses' }));
};

const selectCourse = async () => {
  await openCoursesTab();
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
    axiosMock.onGet(getAssessmentStatsUrl()).reply(200, emptyStats);
  });

  describe('the waffle gate', () => {
    it('does not exist for a user the reporting flag is off for', async () => {
      axiosMock.onGet(getUberFlagsUrl()).reply(200, { enable_reporting: false });
      render(<ReportingPage />, { path: '/reporting' });

      // Opening /reporting directly used to render the page and call the API, so the reader met a
      // generic error instead of being told the page is not there.
      expect(await screen.findByTestId('notFoundAlert')).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Courses' })).not.toBeInTheDocument();
    });

    it('reads a 404 on the flag call as the page not existing', async () => {
      axiosMock.onGet(getUberFlagsUrl()).reply(404);
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByTestId('notFoundAlert')).toBeInTheDocument();
    });
  });

  it('asks a client error only once, instead of retrying something final', async () => {
    axiosMock.onGet(getCurriculumAssignmentsUrl(curriculumUuid)).reply(403);
    render(<ReportingPage />, { path: '/reporting' });
    await selectCurriculum();
    await screen.findByText(/global staff/i);

    // Without the retry rule React Query asks three more times, with backoff, before showing anything.
    const asked = axiosMock.history.get.filter(
      r => r.url === getCurriculumAssignmentsUrl(curriculumUuid),
    );
    expect(asked).toHaveLength(1);
  });

  it('says so when the course list itself fails, instead of offering an empty picker', async () => {
    axiosMock.onGet(getStaffCoursesUrl()).reply(400);
    render(<ReportingPage />, { path: '/reporting' });
    await openCoursesTab();

    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
  });

  it('tells course staff why the curriculum picker is empty', async () => {
    // Curriculums are global-staff only, so this 403s for course staff every time.
    axiosMock.onGet(getAllCurriculumsUrl()).reply(403);
    render(<ReportingPage />, { path: '/reporting' });
    await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));

    expect(await screen.findByText(/global staff/i)).toBeInTheDocument();
  });

  it('shows no table until a course is picked', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });

    // The page heading carries the subtitle alongside the title.
    expect(await screen.findByRole('heading', { name: /Reporting/ })).toBeInTheDocument();
    await openCoursesTab();
    expect(screen.getByRole('option', { name: 'Select a course' })).toBeInTheDocument();
    expect(screen.queryByText('learner1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download CSV/ })).not.toBeInTheDocument();
  });

  it('shows enrollment data and the CSV link once a course is picked', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText('learner1')).toBeInTheDocument();
    expect(screen.getByText('learner1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Oct 29, 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download CSV/ })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 0, results: [] });
    render(<ReportingPage />, { path: '/reporting' });
    await selectCourse();

    expect(await screen.findByText('No learners are enrolled in this course yet.')).toBeInTheDocument();
  });

  it('shows an alert on error', async () => {
    // A 400 rather than a 500: a 4xx is final, so the alert is immediate. The retry rule has its own test.
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(400);
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

  it('shows no curriculum table until one is picked', async () => {
    render(<ReportingPage />, { path: '/reporting' });

    await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));
    expect(await screen.findByRole('option', { name: 'Select a curriculum' })).toBeInTheDocument();
    expect(screen.queryByText('assigned1')).not.toBeInTheDocument();
  });
  describe('the knowledge-gain tabs', () => {
    // Both stats tables on the Courses tab count courses, so assertions name the panel they mean.
    const breakdownPanel = () =>
      screen.getByRole('heading', { name: 'Course breakdown' }).closest('.reporting-panel') as HTMLElement;

    const populated = {
      courses: {
        totals: {
          ...summary({ counted: 2, learners: 8, avg_pre_pct: 30, avg_post_pct: 85, gain_pct: 55 }),
          ...outcome({ attempted: 6, passed: 4, failed: 2, pass_rate_pct: 66.7 }),
        },
        rows: [{
          course_id: courseId,
          display_name: 'Uber 101',
          ...summary({ counted: 1, learners: 5, avg_pre_pct: 30, avg_post_pct: 85, gain_pct: 55 }),
          ...outcome({ attempted: 5, passed: 4, failed: 1, pass_rate_pct: 80 }),
        }],
      },
      retention: {
        totals: { counted: 1, ...outcome({ attempted: 4, passed: 3, failed: 1, pass_rate_pct: 75 }) },
        rows: [{
          course_id: courseId,
          display_name: 'Uber 101',
          retention_course_id: 'course-v1:Uber+R101+2026',
          assigned: 5,
          delay_days: 15,
          pass_threshold_pct: 80,
          max_attempts: 1,
          ...outcome({ attempted: 4, passed: 3, failed: 1, pass_rate_pct: 75 }),
        }],
      },
      curriculum_retention: {
        totals: { counted: 1, ...outcome({ attempted: 2, passed: 2, failed: 0, pass_rate_pct: 100 }) },
        completion: { counted: 1, ...outcome({ attempted: 4, passed: 2, failed: 2, pass_rate_pct: 50 }) },
        rows: [{
          uuid: curriculumUuid,
          title: 'Onboarding',
          retention_course_id: 'course-v1:Uber+R202+2026',
          courses_total: 3,
          assigned: 4,
          completed: 2,
          delay_days: 30,
          pass_threshold_pct: 80,
          max_attempts: 2,
          ...outcome({ attempted: 2, passed: 2, failed: 0, pass_rate_pct: 100 }),
        }],
      },
    };

    it('opens on the course report and charts its comparison and outcomes', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      // The two charts share a row; the table is a panel of its own below them.
      expect(await screen.findByRole('heading', { name: 'Before and after' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Final check outcomes' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Course breakdown' })).toBeInTheDocument();
      // Both bars of each chart are labelled, so neither is identified by its colour alone.
      expect(screen.getByText('Before')).toBeInTheDocument();
      // Retention draws a second outcome chart on this tab, so both have a "Passed" bar.
      expect(screen.getAllByText('Passed')).toHaveLength(2);
      // The scope lives in each chart's own caption.
      expect(screen.getByText('2 courses, 8 learners')).toBeInTheDocument();
      expect(screen.getByText('6 learners sat the Final check')).toBeInTheDocument();
    });

    it('reports retention of a single course beside the knowledge gain', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByRole('heading', { name: 'Retention outcomes' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Retention breakdown' })).toBeInTheDocument();
      // Learners who have not sat it yet are counted as assigned, not as a failure.
      expect(screen.getByText('4 learners sat a retention check')).toBeInTheDocument();
      expect(screen.getByText('15d · 80% · 1 attempt')).toBeInTheDocument();
    });

    it('leaves the retention section out when the backend does not send it', async () => {
      const { retention, ...withoutRetention } = populated;
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, withoutRetention);
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByRole('heading', { name: 'Course breakdown' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Retention outcomes' })).not.toBeInTheDocument();
    });

    it('reports learning-path retention on the Curriculums tab', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });
      await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));

      expect(await screen.findByRole('heading', { name: 'Retention by learning path' })).toBeInTheDocument();
      // The path is also an option in the picker below, so look in the retention table specifically.
      expect(within(screen.getByRole('table')).getByText('Onboarding')).toBeInTheDocument();
      expect(screen.getByText('30d · 80% · 2 attempts')).toBeInTheDocument();
      // Completion sits beside retention: a different cohort, so not a second pass/fail chart.
      expect(screen.getByRole('heading', { name: 'Path completion' })).toBeInTheDocument();
      expect(screen.getByText('In progress')).toBeInTheDocument();
      expect(screen.getByText('4 learners on a learning path')).toBeInTheDocument();
      // Completion counts everyone assigned, retention only those who sat the check: different cohorts.
      expect(screen.getByRole('img', { name: 'Path completion: 2 finished, 2 still working.' })).toBeInTheDocument();
    });

    it('charts the platform-wide comparison, not a column per course', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      const chart = await screen.findByRole('img', { name: /average score/ });
      // Exactly two columns: the aggregate before and after. The per-course detail is the table's job.
      expect(chart.querySelectorAll('rect.reporting-chart__bar')).toHaveLength(2);
      expect([...chart.querySelectorAll('text.reporting-chart__value')].map(n => n.textContent))
        .toEqual(['30%', '85%']);
      // The gain is drawn as the span between the two tops.
      expect(chart.querySelector('text.reporting-chart__delta-value')).toHaveTextContent('+55');
    });

    it('charts how many learners passed the Final check and how many did not', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      const outcomeChart = await screen.findByRole('img', { name: /passed the Final check/ });
      expect([...outcomeChart.querySelectorAll('text.reporting-chart__value')].map(n => n.textContent))
        .toEqual(['4', '2']);
    });

    it('says the course "after" figure covers everyone who sat the check', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByText(/whether or not they passed it/)).toBeInTheDocument();
    });

    it('explains that a course without both checks is left out', async () => {
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByText(/No course has both a Quick check and a Final check/)).toBeInTheDocument();
    });

    it('shows a qualifying course nobody has finished as having nothing to compare', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, {
        ...populated,
        courses: {
          totals: { ...summary({ counted: 1 }), ...outcome() },
          rows: [{
            course_id: courseId,
            display_name: 'Uber 101',
            ...summary({ counted: 1 }),
            ...outcome(),
          }],
        },
      });
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByText(/nothing to compare/)).toBeInTheDocument();
      // The row is still listed: the course is set up, it just has no results yet. The name is also an
      // option in the course picker below, so look for it in the breakdown table specifically.
      expect(within(screen.getAllByRole('table')[0]).getByText('Uber 101')).toBeInTheDocument();
      // And two zero bars would read as a failure rather than as "nobody has sat it".
      expect(screen.getByText('No learner has sat a Final check yet.')).toBeInTheDocument();
    });

    it('paginates the breakdown once it grows past a page', async () => {
      const rows = Array.from({ length: 14 }, (_, i) => ({
        course_id: `course-v1:Uber+${i}+2026`,
        display_name: `Course ${i}`,
        ...summary({ counted: 1, learners: 2, avg_pre_pct: 30, avg_post_pct: 85, gain_pct: 55 }),
        ...outcome({ attempted: 2, passed: 2, failed: 0, pass_rate_pct: 100 }),
      }));
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, {
        ...populated,
        courses: { totals: populated.courses.totals, rows },
      });
      render(<ReportingPage />, { path: '/reporting' });

      // 14 rows over a page size of 10: the first page holds ten of them and a control turns the rest.
      await screen.findByRole('heading', { name: 'Course breakdown' });
      const breakdown = screen.getAllByRole('table')[0];
      expect(within(breakdown).getAllByRole('row')).toHaveLength(11); // ten rows plus the header
      expect(within(breakdownPanel()).getByText('14 courses')).toBeInTheDocument();
      expect(within(breakdownPanel()).getByRole('navigation', { name: 'Reporting pagination' })).toBeInTheDocument();
    });

    it('leaves the pagination control off a breakdown that fits on one page', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      // One qualifying course: the count still shows, but there is no page to turn to.
      await screen.findByRole('heading', { name: 'Course breakdown' });
      expect(within(breakdownPanel()).getByText('1 course')).toBeInTheDocument();
      expect(within(breakdownPanel()).queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('reports a failed request on the Curriculums tab too, which has nothing else to report it', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(400);
      render(<ReportingPage />, { path: '/reporting' });
      await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums' }));

      // Returning nothing here would read as "no learning paths have a check" rather than a failure.
      expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded|try again/i);
    });

    it('tells a user without global staff that the figures are not theirs to see', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(403);
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByRole('alert')).toHaveTextContent(/global staff access/i);
    });
  });
  describe('CSV export', () => {
    // The download is the one place the page hands a file to the user, and it was never exercised:
    // the only assertion looked for a <a> that had already become a <button>, so it could not fail.
    beforeEach(() => {
      Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'blob:csv'), writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn(), writable: true });
    });

    const csvRequests = () => axiosMock.history.get.filter((r) => (r.url ?? '').includes('format=csv'));

    it('asks for the enrollment CSV as a blob, over the authenticated client', async () => {
      axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
      axiosMock.onGet(getCourseEnrollmentsCsvUrl(courseId)).reply(200, 'a,b\n1,2');
      render(<ReportingPage />, { path: '/reporting' });
      await selectCourse();

      await userEvent.click(await screen.findByRole('button', { name: /Download CSV/ }));

      await waitFor(() => expect(csvRequests()).toHaveLength(1));
      // A plain <a href download> would have sent no auth header at all across origins.
      expect(csvRequests()[0].responseType).toBe('blob');
      expect(csvRequests()[0].url).toBe(getCourseEnrollmentsCsvUrl(courseId));
    });

    it('carries the active search into the exported file', async () => {
      axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
      axiosMock.onGet(getCourseEnrollmentsCsvUrl(courseId, 'learner1')).reply(200, 'a,b');
      render(<ReportingPage />, { path: '/reporting' });
      await selectCourse();

      await userEvent.type(screen.getByRole('searchbox'), 'learner1{enter}');
      await waitFor(() => expect(screen.getByRole('button', { name: /Download CSV/ })).toBeEnabled());
      await userEvent.click(screen.getByRole('button', { name: /Download CSV/ }));

      await waitFor(() => expect(csvRequests()).toHaveLength(1));
      expect(csvRequests()[0].url).toContain('search=learner1');
    });

    it('shows an alert when the export fails', async () => {
      axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
      axiosMock.onGet(getCourseEnrollmentsCsvUrl(courseId)).reply(500);
      render(<ReportingPage />, { path: '/reporting' });
      await selectCourse();

      await userEvent.click(await screen.findByRole('button', { name: /Download CSV/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/could not be downloaded|try again/i);
    });

    it('exports the curriculum report too', async () => {
      axiosMock.onGet(getCurriculumAssignmentsUrl(curriculumUuid))
        .reply(200, { count: 1, results: [assignment()] });
      axiosMock.onGet(getCurriculumAssignmentsCsvUrl(curriculumUuid)).reply(200, 'a,b');
      render(<ReportingPage />, { path: '/reporting' });
      await selectCurriculum();

      await userEvent.click(await screen.findByRole('button', { name: /Download CSV/ }));

      await waitFor(() => expect(csvRequests()).toHaveLength(1));
      expect(csvRequests()[0].url).toBe(getCurriculumAssignmentsCsvUrl(curriculumUuid));
    });
  });
});
