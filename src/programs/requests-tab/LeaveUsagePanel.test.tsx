import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import LeaveUsagePanel from './LeaveUsagePanel';
import { LEAVE_USAGE_URL } from './testFixtures';

// Studio's jest setup answers every media query with `matches: false`, which reads as a phone.
jest.mock('@edly-io/frontend-component-fbr', () => ({
  ...jest.requireActual('@edly-io/frontend-component-fbr'),
  useIsBelowLg: () => false,
}));

const USAGE_DATA = {
  program_key: 'prog1',
  threshold: 7,
  leaves: [
    {
      user_id: 1,
      username: 'alice',
      email: 'alice@example.com',
      full_name: 'Alice Smith',
      total_leaves_availed: 3,
      breakdown: { full_day_leaves: 2, session_specific_leaves: 1 },
    },
    {
      user_id: 2,
      username: 'bob',
      email: 'bob@example.com',
      full_name: 'Bob Jones',
      total_leaves_availed: 8,
      breakdown: { full_day_leaves: 6, session_specific_leaves: 2 },
    },
  ],
};

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const renderPanel = () => render(<LeaveUsagePanel programKey="prog1" />);
const usageParams = () => axiosMock.history.get
  .filter((req) => LEAVE_USAGE_URL.test(req.url ?? ''))
  .map((req) => new URL(req.url!).searchParams);

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(LEAVE_USAGE_URL).reply(200, USAGE_DATA);
});

describe('LeaveUsagePanel', () => {
  it("shows the Leave Usage heading and fetches the program's usage", async () => {
    renderPanel();
    expect(screen.getByText('Leave Usage')).toBeInTheDocument();
    await waitFor(() => expect(usageParams()[0].get('program_key')).toBe('prog1'));
  });

  it('renders all student rows after fetch', async () => {
    renderPanel();
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('shows availed / threshold counts per row', async () => {
    renderPanel();
    expect(await screen.findByText('3 / 7')).toBeInTheDocument();
    expect(screen.getByText('8 / 7')).toBeInTheDocument();
  });

  it('shows "No learners found" when leaves array is empty', async () => {
    axiosMock.onGet(LEAVE_USAGE_URL).reply(200, { ...USAGE_DATA, leaves: [] });
    renderPanel();
    expect(await screen.findByText(/no learners found/i)).toBeInTheDocument();
  });

  it('shows error alert on API failure', async () => {
    axiosMock.onGet(LEAVE_USAGE_URL).reply(403, { detail: 'Forbidden' });
    renderPanel();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('search input re-fetches with q param', async () => {
    renderPanel();
    await screen.findByText('Alice Smith');
    fireEvent.change(screen.getByPlaceholderText(/search by name or email/i), { target: { value: 'alice' } });
    await waitFor(() => expect(usageParams().some((params) => params.get('q') === 'alice')).toBe(true));
  });

  it('threshold-exceeded filter re-fetches with threshold_exceeded param', async () => {
    renderPanel();
    await screen.findByText('Alice Smith');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'threshold_exceeded' } });
    await waitFor(() => expect(usageParams().some((params) => params.has('threshold_exceeded'))).toBe(true));
  });
});
