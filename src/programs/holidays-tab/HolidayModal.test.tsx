import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import HolidayModal from './HolidayModal';
import type { Holiday } from './data/types';

const HOLIDAYS_URL = /\/public-holidays\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const renderModal = (props: { holiday?: Holiday | null, onSuccess?: jest.Mock } = {}) => render(
  <HolidayModal onClose={jest.fn()} onSuccess={props.onSuccess ?? jest.fn()} holiday={props.holiday ?? null} />,
);

const dateInputs = () => [screen.getByLabelText(/start date/i), screen.getByLabelText(/end date/i)] as HTMLInputElement[];
const typeName = (name: string) => fireEvent.change(screen.getByPlaceholderText(/eid al-fitr/i), { target: { value: name } });
const clickSave = () => fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
});

describe('create mode', () => {
  it('shows "New holiday" title', () => {
    renderModal();
    expect(screen.getByText('New holiday')).toBeInTheDocument();
  });

  it('shows an error when name is empty on Save', async () => {
    renderModal();
    clickSave();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('shows an error when start date is missing', async () => {
    renderModal();
    typeName('Eid');
    clickSave();
    expect(await screen.findByText('Start date is required')).toBeInTheDocument();
  });

  it('shows an error when end date is missing', async () => {
    renderModal();
    typeName('Eid');
    const [start, end] = dateInputs();
    fireEvent.change(start, { target: { value: '01/04/2026' } });
    // The end date auto-syncs to the start date, so clear it.
    fireEvent.change(end, { target: { value: '' } });
    clickSave();
    expect(await screen.findByText('End date is required')).toBeInTheDocument();
  });

  it('creates the holiday and calls onSuccess on a valid form', async () => {
    const onSuccess = jest.fn();
    axiosMock.onPost(HOLIDAYS_URL).reply(201, { id: 1, name: 'Eid' });
    renderModal({ onSuccess });
    typeName('Eid');
    const [start, end] = dateInputs();
    fireEvent.change(start, { target: { value: '01/04/2026' } });
    fireEvent.change(end, { target: { value: '02/04/2026' } });
    clickSave();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Eid' }));
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      name: 'Eid', start_date: '2026-04-01', end_date: '2026-04-02', description: '',
    });
  });

  it('auto-syncs end date to start date when start is set later', () => {
    renderModal();
    const [start, end] = dateInputs();
    fireEvent.change(start, { target: { value: '10/04/2026' } });
    expect(end.value).toBe('10/04/2026');
  });
});

describe('edit mode', () => {
  const existingHoliday: Holiday = {
    id: 5, name: 'National Day', start_date: '2026-08-14', end_date: '2026-08-14', description: 'Independence',
  };

  it('shows "Edit holiday" title', () => {
    renderModal({ holiday: existingHoliday });
    expect(screen.getByText('Edit holiday')).toBeInTheDocument();
  });

  it('pre-fills the form with existing holiday data', () => {
    renderModal({ holiday: existingHoliday });
    expect(screen.getByDisplayValue('National Day')).toBeInTheDocument();
  });

  it('updates the holiday on save', async () => {
    const onSuccess = jest.fn();
    axiosMock.onPatch(/\/public-holidays\/5\/$/).reply(200, existingHoliday);
    renderModal({ holiday: existingHoliday, onSuccess });
    clickSave();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual(expect.objectContaining({ name: 'National Day' }));
  });
});

describe('API error handling', () => {
  it('shows the API error message when create fails', async () => {
    axiosMock.onPost(HOLIDAYS_URL).reply(400, { detail: 'Server error' });
    renderModal();
    typeName('Eid');
    const [start, end] = dateInputs();
    fireEvent.change(start, { target: { value: '01/04/2026' } });
    fireEvent.change(end, { target: { value: '01/04/2026' } });
    clickSave();
    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });
});
