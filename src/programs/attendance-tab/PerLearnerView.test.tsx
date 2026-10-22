import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import PerLearnerView from './PerLearnerView';
import {
  ADMIN_CONFIG, CONFIG_URL, COURSE_LABEL, COURSES, COURSES_URL, LEARNERS_URL, PROGRAM_KEY, pickOption,
} from './testFixtures';

const TRAINEE_URL = /\/trainees\/11\/attendance\//;
const MARK_URL = /\/sessions\/s-1\/mark-attendance\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const historyRow = {
  session_id: 's-1',
  session_title: 'Week 1 Lecture',
  session_date: '2026-06-01T10:00:00Z',
  status: 'absent',
  record_id: null,
  user_id: 11,
  marking_window_open: true,
};

const renderView = () => render(<PerLearnerView programId={PROGRAM_KEY} />);

const pickCourseAndLearner = async () => {
  await pickOption('Course', COURSE_LABEL);
  await pickOption('Learner', 'Tariq Trainee (tariq@fbr.test)');
};

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(CONFIG_URL).reply(200, ADMIN_CONFIG);
  axiosMock.onGet(COURSES_URL).reply(200, COURSES);
  axiosMock.onGet(LEARNERS_URL).reply(200, [
    {
      id: 11, username: 'tariq', email: 'tariq@fbr.test', first_name: 'Tariq', last_name: 'Trainee',
    },
  ]);
  axiosMock.onGet(TRAINEE_URL).reply(200, { count: 1, results: [historyRow] });
});

it("renders a learner's session rows for the chosen course", async () => {
  renderView();
  await pickCourseAndLearner();
  expect((await screen.findAllByText('Week 1 Lecture')).length).toBeGreaterThan(0);
  const params = new URL(axiosMock.history.get.find((req) => TRAINEE_URL.test(req.url ?? ''))!.url!).searchParams;
  expect(params.get('program_key')).toBe(PROGRAM_KEY);
  expect(params.get('course_id')).toBe(COURSES[0].course_key);
});

it('marks the learner present for a session and refetches their history', async () => {
  axiosMock.onPost(MARK_URL).reply(200, {});
  renderView();
  await pickCourseAndLearner();
  fireEvent.click(await screen.findByRole('button', { name: 'Present' }));
  await waitFor(() => expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
    records: [{ user_id: 11, status: 'present' }],
  }));
  await waitFor(() => expect(axiosMock.history.get.filter((req) => TRAINEE_URL.test(req.url ?? ''))).toHaveLength(2));
});
