import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import LocationModal from './LocationModal';
import type { Location } from './data/types';

const LOCATIONS_URL = /\/locations\/$/;
const LOCATION_URL = /\/locations\/loc2\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const renderModal = (props: Partial<React.ComponentProps<typeof LocationModal>> = {}) => render(
  <LocationModal
    onClose={jest.fn()}
    onSuccess={jest.fn()}
    location={null}
    cityId={null}
    cityName=""
    {...props}
  />,
);

const clickSave = () => fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
});

describe('create mode', () => {
  it('shows "New location" title', () => {
    renderModal();
    expect(screen.getByText('New location')).toBeInTheDocument();
  });

  it('shows an error when name is empty on Save', async () => {
    renderModal();
    clickSave();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('creates the location and calls onSuccess on valid submit', async () => {
    const onSuccess = jest.fn();
    axiosMock.onPost(LOCATIONS_URL).reply(201, { id: 'loc1', name: 'IRSA 1' });
    renderModal({ onSuccess });

    fireEvent.change(screen.getByPlaceholderText(/irsa 1/i), { target: { value: 'IRSA 1' } });
    clickSave();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 'loc1', name: 'IRSA 1' }));
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual(expect.objectContaining({ name: 'IRSA 1' }));
  });

  it('includes description in payload', async () => {
    axiosMock.onPost(LOCATIONS_URL).reply(201, { id: 'loc1', name: 'Lab' });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText(/irsa 1/i), { target: { value: 'Lab' } });
    fireEvent.change(screen.getByPlaceholderText(/optional — building/i), { target: { value: '2nd floor' } });
    clickSave();

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      name: 'Lab',
      description: '2nd floor',
      biometric_machine_serial_number: '',
    });
  });

  it("sends the program's city and shows it", async () => {
    axiosMock.onPost(LOCATIONS_URL).reply(201, { id: 'loc1', name: 'Lab' });
    renderModal({ cityId: 7, cityName: 'Lahore' });

    expect(screen.getByText('Lahore')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/irsa 1/i), { target: { value: 'Lab' } });
    clickSave();

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual(expect.objectContaining({ city: 7 }));
  });
});

describe('edit mode', () => {
  const existingLocation: Location = {
    id: 'loc2',
    city: 7,
    name: 'Hall A',
    description: 'Main hall',
    biometric_machine_serial_number: 'SN-999',
  };

  it('shows "Edit location" title', () => {
    renderModal({ location: existingLocation });
    expect(screen.getByText('Edit location')).toBeInTheDocument();
  });

  it('pre-fills the name field', () => {
    renderModal({ location: existingLocation });
    expect(screen.getByDisplayValue('Hall A')).toBeInTheDocument();
  });

  it('updates the location on save', async () => {
    axiosMock.onPatch(LOCATION_URL).reply(200, existingLocation);
    const onSuccess = jest.fn();
    renderModal({ location: existingLocation, onSuccess, cityId: 7 });

    clickSave();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(existingLocation));
    const payload = JSON.parse(axiosMock.history.patch[0].data);
    expect(payload).toEqual(expect.objectContaining({ name: 'Hall A' }));
    expect(payload).not.toHaveProperty('city');
  });
});

describe('API error handling', () => {
  it('displays error message when create fails', async () => {
    axiosMock.onPost(LOCATIONS_URL).reply(400, { detail: 'Conflict' });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText(/irsa 1/i), { target: { value: 'Lab' } });
    clickSave();

    expect(await screen.findByText('Conflict')).toBeInTheDocument();
  });
});

it('calls onClose when Cancel is clicked', () => {
  const onClose = jest.fn();
  renderModal({ onClose });
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
  expect(onClose).toHaveBeenCalled();
});
