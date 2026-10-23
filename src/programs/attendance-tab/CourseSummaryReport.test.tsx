import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import CourseSummaryReport from './CourseSummaryReport';
import {
  ADMIN_CONFIG, CONFIG_URL, COURSE_LABEL, COURSES, COURSES_URL, PROGRAM_KEY, SETTINGS_URL, pickOption,
} from './testFixtures';

const SUMMARY_URL = /\/courses\/course-v1.+\/attendance-summary\//;
const EXPORT_URL = /\/programs\/.+\/attendance-export\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const summaryRows = [
  {
    user_id: 1, full_name: 'Ayesha Khan', email: 'ayesha@fbr.test', total: 10, present: 9, absent: 1, leave: 0, pending: 0, attendance_rate: 90, is_at_risk: false,
  },
  {
    user_id: 2, full_name: 'Bilal Ahmed', email: 'bilal@fbr.test', total: 10, present: 5, absent: 5, leave: 0, pending: 0, attendance_rate: 50, is_at_risk: true,
  },
];

const renderReport = () => render(<CourseSummaryReport programId={PROGRAM_KEY} />);

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(CONFIG_URL).reply(200, ADMIN_CONFIG);
  axiosMock.onGet(SETTINGS_URL).reply(200, { marking_window_days: 7, at_risk_threshold_percent: 75 });
  axiosMock.onGet(COURSES_URL).reply(200, COURSES);
  axiosMock.onGet(SUMMARY_URL).reply(200, { results: summaryRows });
});

it("renders each learner's attendance for the chosen course", async () => {
  renderReport();
  await pickOption('Course', COURSE_LABEL);
  expect((await screen.findAllByText('Ayesha Khan')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Bilal Ahmed').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /at risk/i })).toHaveTextContent('(1)');
});

it("exports the program's attendance", async () => {
  window.URL.createObjectURL = jest.fn(() => 'blob:export');
  window.URL.revokeObjectURL = jest.fn();
  axiosMock.onGet(EXPORT_URL).reply(200, 'xlsx', { 'content-disposition': 'attachment; filename="report.xlsx"' });
  renderReport();
  fireEvent.click(screen.getByRole('button', { name: /export attendance report/i }));
  await waitFor(() => expect(axiosMock.history.get.some((req) => EXPORT_URL.test(req.url ?? ''))).toBe(true));
  const exportUrl = axiosMock.history.get.find((req) => EXPORT_URL.test(req.url ?? ''))!.url!;
  expect(exportUrl).toContain(`/programs/${encodeURIComponent(PROGRAM_KEY)}/attendance-export/`);
});

it('saves a new marking window and refreshes the config', async () => {
  axiosMock.onPatch(SETTINGS_URL).reply(200, { marking_window_days: 10, at_risk_threshold_percent: 75 });
  renderReport();
  const input = await screen.findByLabelText('Marking window days');
  await waitFor(() => expect(input).toHaveValue(7));
  fireEvent.change(input, { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual({ marking_window_days: 10 }));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  await waitFor(() => expect(axiosMock.history.get.filter((req) => CONFIG_URL.test(req.url ?? '')).length).toBeGreaterThan(1));
});
