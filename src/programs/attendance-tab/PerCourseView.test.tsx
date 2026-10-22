import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import PerCourseView from './PerCourseView';
import {
  COURSE_LABEL, COURSE_SESSIONS_URL, COURSES, COURSES_URL, NO_COURSE_SESSIONS_URL, PROGRAM_KEY, pickOption,
} from './testFixtures';

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const NO_COURSE_LABEL = 'Sessions without a course';

const sessionRow = (n: number) => ({
  id: `session-${n}`,
  title: `Session ${n}`,
  scheduled_start_time: '2026-06-01T10:00:00Z',
  status: 'completed',
  marking_window_open: false,
});

/** Answers a sessions list with one row per page, numbered by the requested page. */
const pagedSessions = (count: number) => (config: { url?: string }): [number, object] => {
  const page = Number(new URL(config.url!).searchParams.get('page'));
  return [200, { count, results: [sessionRow(page)] }];
};

const requestsTo = (url: RegExp) => axiosMock.history.get
  .filter((req) => url.test(req.url ?? ''))
  .map((req) => new URL(req.url!).searchParams);

const renderView = () => render(<PerCourseView programId={PROGRAM_KEY} />);

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(COURSES_URL).reply(200, COURSES);
  axiosMock.onGet(NO_COURSE_SESSIONS_URL).reply(200, { count: 0, results: [] });
});

it('requests the selected course from the paginated endpoint', async () => {
  axiosMock.onGet(COURSE_SESSIONS_URL).reply(200, { count: 1, results: [sessionRow(1)] });
  renderView();
  await pickOption('Course', COURSE_LABEL);
  expect((await screen.findAllByText('Session 1')).length).toBeGreaterThan(0);
  const [params] = requestsTo(COURSE_SESSIONS_URL);
  expect(params.get('program_key')).toBe(PROGRAM_KEY);
  expect(params.get('page')).toBe('1');
  expect(params.get('page_size')).toBe('25');
});

it('pages on the server rather than in the browser', async () => {
  axiosMock.onGet(COURSE_SESSIONS_URL).reply(pagedSessions(30));
  renderView();
  await pickOption('Course', COURSE_LABEL);
  expect((await screen.findAllByText('Session 1')).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: /^next/i }));
  expect((await screen.findAllByText('Session 2')).length).toBeGreaterThan(0);
  expect(requestsTo(COURSE_SESSIONS_URL).pop()?.get('page')).toBe('2');
});

it('leaves the next-page control disabled when everything fits on one page', async () => {
  axiosMock.onGet(COURSE_SESSIONS_URL).reply(200, { count: 1, results: [sessionRow(1)] });
  renderView();
  await pickOption('Course', COURSE_LABEL);
  expect((await screen.findAllByText('Session 1')).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /^next/i })).toBeDisabled();
  expect(requestsTo(COURSE_SESSIONS_URL)).toHaveLength(1);
});

it('uses the dedicated no-course endpoint for the no-course option', async () => {
  axiosMock.onGet(NO_COURSE_SESSIONS_URL).reply(200, { count: 1, results: [sessionRow(9)] });
  renderView();
  await pickOption('Course', NO_COURSE_LABEL);
  expect((await screen.findAllByText('Session 9')).length).toBeGreaterThan(0);
  expect(requestsTo(NO_COURSE_SESSIONS_URL)[0].get('program_key')).toBe(PROGRAM_KEY);
  expect(requestsTo(COURSE_SESSIONS_URL)).toHaveLength(0);
});

it('pages the no-course option on the server', async () => {
  axiosMock.onGet(NO_COURSE_SESSIONS_URL).reply(pagedSessions(30));
  renderView();
  await pickOption('Course', NO_COURSE_LABEL);
  expect((await screen.findAllByText('Session 1')).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: /^next/i }));
  expect((await screen.findAllByText('Session 2')).length).toBeGreaterThan(0);
  expect(requestsTo(NO_COURSE_SESSIONS_URL).pop()?.get('page')).toBe('2');
});

it('shows the empty state when the course has no sessions', async () => {
  axiosMock.onGet(COURSE_SESSIONS_URL).reply(200, { count: 0, results: [] });
  renderView();
  await pickOption('Course', COURSE_LABEL);
  expect(await screen.findByText(/no completed sessions found/i)).toBeInTheDocument();
});

it('shows the empty state when the programme has no course-less sessions', async () => {
  renderView();
  await pickOption('Course', NO_COURSE_LABEL);
  await waitFor(() => expect(screen.getByText(/no completed sessions found/i)).toBeInTheDocument());
});
