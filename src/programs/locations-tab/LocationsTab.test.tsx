import {
  fireEvent, initializeMocks, render, screen, waitFor, within,
} from '@src/testUtils';
import LocationsTab from './LocationsTab';

jest.mock('@edly-io/frontend-component-fbr', () => ({
  ...jest.requireActual('@edly-io/frontend-component-fbr'),
  AuditLogTable: function MockAuditLogTable({ recordFilter }: { recordFilter?: string }) {
    return <div data-testid="audit-log-table">Audit Log {recordFilter}</div>;
  },
}));

const PROGRAM_KEY = 'program-v1:FBR+STP+2026-A';
const LIST_URL = /\/fbr\/api\/attendance\/v1\/locations\/\?/;
const CREATE_URL = /\/fbr\/api\/attendance\/v1\/locations\/$/;
const PROGRAM_URL = /\/fbr\/api\/programs\//;

const irsa = {
  id: 'loc1', city: 7, name: 'IRSA 1', description: 'Ground floor', biometric_machine_serial_number: '',
};
const page = (results: object[]) => ({ count: results.length, results });

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];
let mockShowToast: jest.Mock;

const renderTab = (search = '') => render(<LocationsTab programId={PROGRAM_KEY} />, {
  routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/locations${search}`] },
});

const listRequests = () => axiosMock.history.get.filter((req) => LIST_URL.test(req.url ?? ''));

beforeEach(() => {
  const mocks = initializeMocks();
  axiosMock = mocks.axiosMock;
  mockShowToast = mocks.mockShowToast as jest.Mock;
  axiosMock.onGet(PROGRAM_URL).reply(200, { program_key: PROGRAM_KEY, city: { id: 7, name: 'Lahore' } });
});

describe('<LocationsTab />', () => {
  it('shows loading spinner initially', () => {
    axiosMock.onGet(LIST_URL).reply(() => new Promise(() => {}));
    renderTab();
    expect(document.querySelector('.spinner-border')).not.toBeNull();
  });

  it("requests the first page of the program's locations", async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    renderTab();
    await screen.findByText('IRSA 1');
    const url = new URL(listRequests()[0].url!);
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('page_size')).toBe('20');
    expect(url.searchParams.get('program_key')).toBe(PROGRAM_KEY);
  });

  it('renders locations after data loads, with description and city', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    renderTab();
    expect(await screen.findByText('IRSA 1')).toBeInTheDocument();
    expect(screen.getByText('Ground floor')).toBeInTheDocument();
    expect(await screen.findByText('Lahore')).toBeInTheDocument();
  });

  it('shows empty state when no locations exist', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([]));
    renderTab();
    expect(await screen.findByText(/no locations found/i)).toBeInTheDocument();
  });

  it('shows "New location" button', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([]));
    renderTab();
    expect(await screen.findByRole('button', { name: /new location/i })).toBeInTheDocument();
  });

  it('shows the backend error message when fetch fails', async () => {
    axiosMock.onGet(LIST_URL).reply(403, { detail: 'Server error' });
    renderTab();
    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });

  it('renders a 403 on the list as an error Alert, not a spinner', async () => {
    axiosMock.onGet(LIST_URL).reply(403, { detail: 'You do not have permission to perform this action.' });
    renderTab();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('You do not have permission to perform this action.');
    expect(document.querySelector('.spinner-border')).toBeNull();
  });

  it('searches by name after typing', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    renderTab();
    await screen.findByText('IRSA 1');
    fireEvent.change(screen.getByPlaceholderText('Search locations…'), { target: { value: 'lab' } });
    await waitFor(() => expect(
      listRequests().some((req) => new URL(req.url!).searchParams.get('search') === 'lab'),
    ).toBe(true));
  });

  it('shows Locations and Audit Log tabs', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([]));
    renderTab();
    await screen.findByText(/no locations found/i);
    expect(screen.getByRole('button', { name: /^locations$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^audit log$/i })).toBeInTheDocument();
  });

  it('switches to audit log view when Audit Log tab is clicked', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([]));
    renderTab();
    await screen.findByText(/no locations found/i);
    fireEvent.click(screen.getByRole('button', { name: /^audit log$/i }));
    expect(await screen.findByTestId('audit-log-table')).toBeInTheDocument();
    expect(screen.queryByText(/no locations found/i)).not.toBeInTheDocument();
  });

  it("opens a location's audit history from its History action", async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    renderTab();
    await screen.findByText('IRSA 1');
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByTestId('audit-log-table')).toHaveTextContent('Audit Log loc1');
  });

  it('opens the edit modal from a ?modal=edit-location deep link', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    renderTab('?modal=edit-location&id=loc1');
    expect(await screen.findByText('Edit location')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IRSA 1')).toBeInTheDocument();
  });

  it('refetches the list after a successful create, without remounting', async () => {
    const hallB = { ...irsa, id: 'loc2', name: 'Hall B' };
    axiosMock.onGet(LIST_URL).replyOnce(200, page([irsa])).onGet(LIST_URL).reply(200, page([irsa, hallB]));
    axiosMock.onPost(CREATE_URL).reply(201, hallB);
    renderTab();
    await screen.findByText('IRSA 1');
    await screen.findByText('Lahore');

    fireEvent.click(screen.getByRole('button', { name: /new location/i }));
    fireEvent.change(screen.getByPlaceholderText(/irsa 1/i), { target: { value: 'Hall B' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText('Hall B')).toBeInTheDocument();
    expect(screen.getByText('IRSA 1')).toBeInTheDocument();
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual(expect.objectContaining({ name: 'Hall B', city: 7 }));
    expect(listRequests()).toHaveLength(2);
    expect(mockShowToast).toHaveBeenCalledWith('Created Hall B.');
  });

  it('shows an "Updated" toast after an edit', async () => {
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    axiosMock.onPatch(/\/locations\/loc1\/$/).reply(200, { ...irsa, name: 'IRSA 2' });
    renderTab();
    await screen.findByText('IRSA 1');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByDisplayValue('IRSA 1'), { target: { value: 'IRSA 2' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Updated IRSA 2.'));
  });

  it('deletes a location, refetches and shows a toast', async () => {
    axiosMock.onGet(LIST_URL).replyOnce(200, page([irsa])).onGet(LIST_URL).reply(200, page([]));
    axiosMock.onDelete(/\/locations\/loc1\/$/).reply(204);
    renderTab();
    await screen.findByText('IRSA 1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/no locations found/i)).toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith('Deleted IRSA 1.');
  });

  it('shows the backend reason when a delete is blocked', async () => {
    const reason = "Cannot delete 'IRSA 1' — 2 session(s) still reference it.";
    axiosMock.onGet(LIST_URL).reply(200, page([irsa]));
    axiosMock.onDelete(/\/locations\/loc1\/$/).reply(400, { error: 'location_in_use', detail: reason });
    renderTab();
    await screen.findByText('IRSA 1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByText(reason)).toBeInTheDocument();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
