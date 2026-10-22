import { initializeMocks, render, screen } from '@src/testUtils';
import RequestsSubNav from './RequestsSubNav';
import { COUNTS_URL, PROGRAM_KEY } from './testFixtures';

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const renderSubNav = () => render(<RequestsSubNav programId={PROGRAM_KEY} />, {
  routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/requests/leaves`] },
});

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(COUNTS_URL).reply(200, { leaves: 5, remote_sessions: 2, substitute_requests: 1 });
});

describe('RequestsSubNav badges', () => {
  it('shows how much work each tab holds', async () => {
    renderSubNav();
    expect(await screen.findByLabelText('5 awaiting action')).toHaveTextContent('5');
    expect(screen.getByLabelText('2 awaiting action')).toHaveTextContent('2');
    expect(screen.getByLabelText('1 awaiting action')).toHaveTextContent('1');
  });

  it('renders no badge for an empty queue', async () => {
    axiosMock.onGet(COUNTS_URL).reply(200, { leaves: 0, remote_sessions: 3, substitute_requests: 0 });
    renderSubNav();
    expect(await screen.findByLabelText('3 awaiting action')).toBeInTheDocument();
    expect(screen.queryByLabelText('0 awaiting action')).not.toBeInTheDocument();
  });

  it('still renders the tabs when the count request fails', async () => {
    axiosMock.onGet(COUNTS_URL).reply(403);
    renderSubNav();
    expect(await screen.findByText('Leaves')).toBeInTheDocument();
    expect(screen.getByText('Remote Sessions')).toBeInTheDocument();
    expect(screen.getByText('Substitute Requests')).toBeInTheDocument();
  });

  it('links each sub-tab under the Studio requests tab', () => {
    renderSubNav();
    expect(screen.getByRole('link', { name: /^Remote Sessions/ })).toHaveAttribute(
      'href',
      `/programs/${PROGRAM_KEY}/requests/remote-sessions`,
    );
  });
});
