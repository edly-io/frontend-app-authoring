import {
  fireEvent, initializeMocks, render, screen, waitFor, within,
} from '@src/testUtils';
import AdminRequestsView from './AdminRequestsView';
import type { RequestType } from './data/types';
import {
  LEAVE_LIST_URL, LEAVE_USAGE_URL, PROGRAM_KEY, REMOTE_LIST_URL, makeRequest, offsetDate, page,
} from './testFixtures';

jest.mock('@edly-io/frontend-component-fbr', () => ({
  ...jest.requireActual('@edly-io/frontend-component-fbr'),
  // Studio's jest setup answers every media query with `matches: false`, which reads as a phone.
  useIsBelowLg: () => false,
  SessionLeavesPanel: function MockSessionLeavesPanel() { return null; },
}));

const REVIEW_URL = /\/requests\/leave\/1\/review\/$/;
const BULK_URL = /\/requests\/leave\/bulk-approve\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const listUrl = (type: RequestType) => (type === 'leave' ? LEAVE_LIST_URL : REMOTE_LIST_URL);
const mockList = (results: object[], type: RequestType = 'leave') => axiosMock.onGet(listUrl(type)).reply(200, page(results));
const renderView = (lockedType: RequestType = 'leave') => render(
  <AdminRequestsView programId={PROGRAM_KEY} lockedType={lockedType} />,
);
const reviewBody = () => JSON.parse(axiosMock.history.patch[0].data);
const listRequests = () => axiosMock.history.get.filter((req) => LEAVE_LIST_URL.test(req.url ?? ''));

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(LEAVE_USAGE_URL).reply(200, { threshold: 5, leaves: [] });
  axiosMock.onPatch(REVIEW_URL).reply(200, makeRequest({ state: 'APPROVED' }));
  mockList([makeRequest()]);
});

describe('PENDING request actions', () => {
  it('shows Approve and Reject buttons', async () => {
    renderView();
    expect(await screen.findByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
  });

  it('does not show withdrawal action buttons for PENDING', async () => {
    renderView();
    await screen.findByRole('button', { name: /^approve$/i });
    expect(screen.queryByRole('button', { name: /approve withdrawal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject withdrawal/i })).not.toBeInTheDocument();
  });

  it('approves with an empty note when Approve is clicked', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'APPROVED', reviewer_note: '' }));
  });

  it('opens note modal when Reject is clicked', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /^reject$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('rejects with the note on modal confirm', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /^reject$/i }));
    fireEvent.change(screen.getByPlaceholderText(/let them know why/i), { target: { value: 'No capacity' } });
    fireEvent.click(screen.getByRole('button', { name: /reject request/i }));
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'REJECTED', reviewer_note: 'No capacity' }));
  });

  it('refetches the list after an approval, without a reload', async () => {
    // Pending until reviewed, approved on every fetch after that.
    let listCalls = 0;
    axiosMock.onGet(LEAVE_LIST_URL).reply(() => {
      listCalls += 1;
      return [200, page([makeRequest({ state: listCalls === 1 ? 'PENDING' : 'APPROVED' })])];
    });
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /^approve$/i }));
    expect(await within(await screen.findByRole('table')).findByText('Approved')).toBeInTheDocument();
    expect(listRequests()).toHaveLength(2);
  });
});

describe('WITHDRAWAL_PENDING request actions', () => {
  beforeEach(() => {
    mockList([makeRequest({ state: 'WITHDRAWAL_PENDING' })]);
  });

  it('shows Approve Withdrawal and Reject Withdrawal buttons', async () => {
    renderView();
    expect(await screen.findByRole('button', { name: /approve withdrawal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject withdrawal/i })).toBeInTheDocument();
  });

  it('does not show plain Approve/Reject buttons for WITHDRAWAL_PENDING', async () => {
    renderView();
    await screen.findByRole('button', { name: /approve withdrawal/i });
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();
  });

  it('marks the request WITHDRAWN when Approve Withdrawal is clicked', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /approve withdrawal/i }));
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'WITHDRAWN', reviewer_note: '' }));
  });

  it('opens note modal when Reject Withdrawal is clicked', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /reject withdrawal/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('marks the request WITHDRAWAL_REJECTED on modal confirm', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /reject withdrawal/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /reject withdrawal/i }));
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'WITHDRAWAL_REJECTED', reviewer_note: '' }));
  });
});

describe('past-dated leave approvals', () => {
  it('shows the approve warning on a past-dated pending request', async () => {
    mockList([makeRequest({ leave_start_date: offsetDate(-1) })]);
    renderView();
    expect(await screen.findByText(/check the trainee wasn't marked present/i)).toBeInTheDocument();
  });

  it('approves a past-dated pending leave in one click, with no note and no modal', async () => {
    mockList([makeRequest({ leave_start_date: offsetDate(-1) })]);
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'APPROVED', reviewer_note: '' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requires a note in a modal for a past-dated withdrawal approval', async () => {
    mockList([makeRequest({ state: 'WITHDRAWAL_PENDING', leave_start_date: offsetDate(-1) })]);
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /approve withdrawal/i }));
    const dialog = screen.getByRole('dialog');
    expect(axiosMock.history.patch).toHaveLength(0);
    const confirm = within(dialog).getByRole('button', { name: /approve withdrawal/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(
      within(dialog).getByPlaceholderText(/explain why this withdrawal is being approved/i),
      { target: { value: 'Confirmed attended' } },
    );
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'WITHDRAWN', reviewer_note: 'Confirmed attended' }));
  });

  it('does not require a note for a future-dated withdrawal (one click)', async () => {
    mockList([makeRequest({ state: 'WITHDRAWAL_PENDING', leave_start_date: offsetDate(1) })]);
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /approve withdrawal/i }));
    await waitFor(() => expect(reviewBody()).toEqual({ state: 'WITHDRAWN', reviewer_note: '' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('bulk approve confirmation', () => {
  beforeEach(() => {
    axiosMock.onPost(BULK_URL).reply(200, { approved_count: 1, ignored_count: 0 });
  });

  it('shows a confirm dialog before bulk-approving when a selected leave is past-dated', async () => {
    mockList([makeRequest({ leave_start_date: offsetDate(-1) })]);
    renderView();
    fireEvent.click(await screen.findByLabelText(/select all pending/i));
    fireEvent.click(screen.getByRole('button', { name: /bulk approve/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/already passed/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Alice/)).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: /approve all/i }));
    await waitFor(() => expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      program_key: PROGRAM_KEY, leave_ids: ['1'],
    }));
  });

  it('bulk-approves directly (no confirm) when no selected leave is past-dated', async () => {
    mockList([makeRequest({ leave_start_date: offsetDate(1) })]);
    renderView();
    fireEvent.click(await screen.findByLabelText(/select all pending/i));
    fireEvent.click(screen.getByRole('button', { name: /bulk approve/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
  });
});

describe('would_exceed_threshold flag', () => {
  it('shows threshold warning on the leaves tab', async () => {
    mockList([makeRequest({ would_exceed_threshold: true })]);
    renderView('leave');
    expect(await screen.findByText(/approval would exceed threshold/i)).toBeInTheDocument();
  });

  it('does NOT show threshold warning on the remote sessions tab', async () => {
    mockList([makeRequest({ request_type_label: 'remote_session', would_exceed_threshold: true })], 'remote_session');
    renderView('remote_session');
    await screen.findByRole('table');
    expect(screen.queryByText(/approval would exceed threshold/i)).not.toBeInTheDocument();
  });

  it('does NOT show threshold warning when would_exceed_threshold is false', async () => {
    mockList([makeRequest({ would_exceed_threshold: false })]);
    renderView('leave');
    await screen.findByRole('table');
    expect(screen.queryByText(/approval would exceed threshold/i)).not.toBeInTheDocument();
  });

  it('shows submitter role badge when provided by the leave API', async () => {
    mockList([makeRequest({ submitter_role: 'instructor' })]);
    renderView('leave');
    expect(await screen.findByText('Instructor')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });
});

describe.each([
  ['APPROVED'],
  ['REJECTED'],
  ['CANCELLED'],
  ['WITHDRAWN'],
])('%s request', (state) => {
  it('shows no action buttons', async () => {
    mockList([makeRequest({ state })]);
    renderView();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument();
  });
});

describe('list errors', () => {
  it('shows a 403 on the list as an error Alert, not a spinner', async () => {
    axiosMock.onGet(LEAVE_LIST_URL).reply(403, { detail: 'You do not have permission to perform this action.' });
    renderView();
    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
    expect(screen.queryByText('Loading requests...')).not.toBeInTheDocument();
  });
});
