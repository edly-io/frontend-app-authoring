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
  getAssessmentStatsUrl,
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
  curriculums: { totals: { ...summary(), ...outcome() }, rows: [] },
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

  it('shows no table until a course is picked', async () => {
    axiosMock.onGet(getCourseEnrollmentsUrl(courseId)).reply(200, { count: 1, results: [enrollment(1)] });
    render(<ReportingPage />, { path: '/reporting' });

    // The page heading carries the subtitle alongside the title.
    expect(await screen.findByRole('heading', { name: /Reporting/ })).toBeInTheDocument();
    await openCoursesTab();
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
      curriculums: {
        totals: {
          ...summary({ counted: 1, learners: 3, avg_pre_pct: 40, avg_post_pct: 75, gain_pct: 35 }),
          ...outcome({ attempted: 3, passed: 2, failed: 1, pass_rate_pct: 66.7 }),
        },
        rows: [{
          uuid: curriculumUuid,
          title: 'Onboarding',
          delay_days: 15,
          pass_threshold_pct: 80,
          max_attempts: 1,
          ...summary({ counted: 1, learners: 3, avg_pre_pct: 40, avg_post_pct: 75, gain_pct: 35 }),
          ...outcome({ attempted: 3, passed: 2, failed: 1, pass_rate_pct: 66.7 }),
        }],
      },
    };

    const openCurriculumGain = async () => {
      await userEvent.click(await screen.findByRole('tab', { name: 'Curriculums knowledge gain' }));
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
      expect(screen.getByText('Passed')).toBeInTheDocument();
      // The scope lives in each chart's own caption.
      expect(screen.getByText('2 courses, 8 learners')).toBeInTheDocument();
      expect(screen.getByText('6 learners sat the Final check')).toBeInTheDocument();
    });

    it('keeps the curriculum report on its own tab', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(200, populated);
      render(<ReportingPage />, { path: '/reporting' });

      // Nothing of the curriculum report is on the course tab.
      expect(await screen.findByText('Uber 101')).toBeInTheDocument();
      expect(screen.queryByText('Onboarding')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Retention check outcomes' })).not.toBeInTheDocument();

      await openCurriculumGain();

      expect(await screen.findByRole('heading', { name: 'Retention check outcomes' })).toBeInTheDocument();
      expect(screen.getByText('Onboarding')).toBeInTheDocument();
      expect(screen.getByText('3 learners sat the retention check')).toBeInTheDocument();
      expect(screen.getByText('15d · 80% · 1 attempt')).toBeInTheDocument();
      // ...and nothing of the course report is on the curriculum tab.
      expect(screen.queryByText('Uber 101')).not.toBeInTheDocument();
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

    it('explains on each tab that something without both checks is left out', async () => {
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByText(/No course has both a Quick check and a Final check/)).toBeInTheDocument();

      await openCurriculumGain();

      expect(await screen.findByText(/No curriculum has a Quick check in its first course/)).toBeInTheDocument();
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
      // The row is still listed: the course is set up, it just has no results yet.
      expect(screen.getByText('Uber 101')).toBeInTheDocument();
      // And two zero bars would read as a failure rather than as "nobody has sat it".
      expect(screen.getByText('No learner has sat a Final check yet.')).toBeInTheDocument();
    });

    it('scrolls the breakdown in place instead of paginating it', async () => {
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
      const { container } = render(<ReportingPage />, { path: '/reporting' });

      // Every row is rendered -- there is no page to turn to reach the last one.
      expect(await screen.findByText('Course 13')).toBeInTheDocument();
      expect(screen.getByText('Course 0')).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(container.querySelector('.reporting-table-scroll--capped')).toBeInTheDocument();
    });

    it('tells a user without global staff that the figures are not theirs to see', async () => {
      axiosMock.onGet(getAssessmentStatsUrl()).reply(403);
      render(<ReportingPage />, { path: '/reporting' });

      expect(await screen.findByRole('alert')).toHaveTextContent(/global staff access/i);
    });
  });
});
