import { Route, Routes, useLocation } from 'react-router-dom';
import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import RequestsTab from './RequestsTab';
import {
  COUNTS_URL, LEAVE_LIST_URL, LEAVE_USAGE_URL, PROGRAM_KEY, REMOTE_LIST_URL, makeRequest, page,
} from './testFixtures';

jest.mock('@edly-io/frontend-component-fbr', () => ({
  ...jest.requireActual('@edly-io/frontend-component-fbr'),
  // Studio's jest setup answers every media query with `matches: false`, which reads as a phone.
  useIsBelowLg: () => false,
  AuditLogTable: function MockAuditLogTable({ recordFilter }: { recordFilter?: string }) {
    return <div data-testid="audit-log-table">Audit Log {recordFilter}</div>;
  },
  SessionLeavesPanel: function MockSessionLeavesPanel() { return null; },
}));

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const LocationDisplay = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

// Mounted the way ProgramDetailPage mounts it: under `/programs/:programId/*`.
const renderTab = (path: string) => render(
  <Routes>
    <Route
      path="/programs/:programId/*"
      element={(
        <>
          <RequestsTab programId={PROGRAM_KEY} />
          <LocationDisplay />
        </>
      )}
    />
  </Routes>,
  { routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/${path}`] } },
);

const getCount = (url: RegExp) => axiosMock.history.get.filter((req) => url.test(req.url ?? '')).length;

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(COUNTS_URL).reply(200, { leaves: 1, remote_sessions: 0, substitute_requests: 0 });
  axiosMock.onGet(LEAVE_USAGE_URL).reply(200, { threshold: 5, leaves: [] });
  axiosMock.onGet(LEAVE_LIST_URL).reply(200, page([makeRequest()]));
  axiosMock.onGet(REMOTE_LIST_URL).reply(200, page([]));
});

describe('<RequestsTab />', () => {
  it('redirects /requests to the leaves sub-tab', async () => {
    renderTab('requests');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/programs/${PROGRAM_KEY}/requests/leaves`));
    expect(await screen.findByRole('button', { name: /^approve$/i })).toBeInTheDocument();
  });

  it('renders the remote sessions sub-tab at its URL', async () => {
    renderTab('requests/remote-sessions');
    expect(await screen.findByText('No requests found.')).toBeInTheDocument();
    expect(getCount(REMOTE_LIST_URL)).toBe(1);
  });

  it('refetches the list and the count badge after approving a leave', async () => {
    axiosMock.onPatch(/\/requests\/leave\/1\/review\/$/).reply(200, makeRequest({ state: 'APPROVED' }));
    renderTab('requests/leaves');
    await screen.findByLabelText('1 awaiting action');
    fireEvent.click(await screen.findByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(getCount(LEAVE_LIST_URL)).toBe(2));
    await waitFor(() => expect(getCount(COUNTS_URL)).toBe(2));
  });

  it('shows a 403 on the list as an error Alert', async () => {
    axiosMock.onGet(LEAVE_LIST_URL).reply(403, { detail: 'You do not have permission to perform this action.' });
    renderTab('requests/leaves');
    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
  });

  it('switches to the audit log and hides the sub-tabs', async () => {
    renderTab('requests/leaves');
    fireEvent.click(screen.getByRole('button', { name: /^audit log$/i }));
    expect(await screen.findByTestId('audit-log-table')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Leaves/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('view=audit-log');
  });

  it("opens a request's history from its History link", async () => {
    renderTab('requests/leaves');
    fireEvent.click(await screen.findByRole('link', { name: 'History' }));
    expect(await screen.findByTestId('audit-log-table')).toHaveTextContent('Audit Log 1');
  });

  it('offers Leave settings on the leaves list only', async () => {
    renderTab('requests/remote-sessions');
    await screen.findByText('No requests found.');
    expect(screen.queryByRole('button', { name: /leave settings/i })).not.toBeInTheDocument();
  });
});
