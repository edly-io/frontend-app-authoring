import {
  fireEvent, initializeMocks, render, screen, within,
} from '@src/testUtils';
import HolidaysTab from './HolidaysTab';

const LIST_URL = /\/fbr\/api\/attendance\/v1\/public-holidays\/\?/;

const eid = {
  id: 1, name: 'Eid al-Fitr', start_date: '2026-04-01', end_date: '2026-04-01', description: '',
};
const page = (results: object[]) => ({ count: results.length, results });

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];
let mockShowToast: jest.Mock;

const renderTab = () => render(<HolidaysTab />);
const listRequests = () => axiosMock.history.get.filter((req) => LIST_URL.test(req.url ?? ''));

beforeEach(() => {
  const mocks = initializeMocks();
  axiosMock = mocks.axiosMock;
  mockShowToast = mocks.mockShowToast as jest.Mock;
});

describe('<HolidaysTab />', () => {
  it('shows loading spinner initially', () => {
    axiosMock.onGet(LIST_URL).reply(() => new Promise(() => {}));
    renderTab();
    expect(document.querySelector('.spinner-border')).not.toBeNull();
  });

  it('renders holidays table after data loads', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([eid]));
    renderTab();
    expect(await screen.findByText('Eid al-Fitr')).toBeInTheDocument();
    expect(screen.getByText('Apr 1, 2026')).toBeInTheDocument();
  });

  it('shows empty state when no holidays exist', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([]));
    renderTab();
    expect(await screen.findByText(/no holidays found/i)).toBeInTheDocument();
  });

  it('shows "New holiday" button for admin', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([]));
    renderTab();
    expect(await screen.findByRole('button', { name: /new holiday/i })).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    // A 404: the library's query options retry other errors with backoff.
    axiosMock.onGet(LIST_URL).reply(404, { detail: 'Not found.' });
    renderTab();
    expect(await screen.findByText('Not found.')).toBeInTheDocument();
  });

  it('renders a 403 on the list as an error Alert, not a spinner', async () => {
    axiosMock.onGet(LIST_URL).reply(403, { detail: 'You do not have permission to perform this action.' });
    renderTab();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('You do not have permission to perform this action.');
    expect(document.querySelector('.spinner-border')).toBeNull();
  });

  it('removes a deleted holiday from the list without remounting', async () => {
    axiosMock.onGet(LIST_URL).replyOnce(200, page([eid])).onGet(LIST_URL).reply(200, page([]));
    axiosMock.onDelete(/\/public-holidays\/1\/$/).reply(204);
    renderTab();
    await screen.findByText('Eid al-Fitr');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Eid al-Fitr' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/no holidays found/i)).toBeInTheDocument();
    expect(screen.queryByText('Eid al-Fitr')).not.toBeInTheDocument();
    expect(listRequests()).toHaveLength(2);
    expect(mockShowToast).toHaveBeenCalledWith('Deleted Eid al-Fitr.');
  });
});
