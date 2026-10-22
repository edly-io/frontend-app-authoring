import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import LeaveSettingsModal from './LeaveSettingsModal';

const PROGRAM_URL = /\/fbr\/api\/programs\/prog1\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const openModal = async () => {
  render(<LeaveSettingsModal programKey="prog1" />);
  fireEvent.click(screen.getByRole('button', { name: /leave settings/i }));
  return screen.findByLabelText(/leave threshold/i);
};

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onGet(PROGRAM_URL).reply(200, { program_key: 'prog1', threshold: 7 });
});

describe('LeaveSettingsModal', () => {
  it('loads the current threshold when opened', async () => {
    const input = await openModal();
    expect(input).toHaveValue(7);
  });

  it('does not load the program until it is opened', () => {
    render(<LeaveSettingsModal programKey="prog1" />);
    expect(axiosMock.history.get).toHaveLength(0);
  });

  it('keeps Save disabled until the value changes', async () => {
    await openModal();
    const save = screen.getByRole('button', { name: /^save$/i });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /increase threshold/i }));
    expect(save).not.toBeDisabled();
  });

  it('saves the new threshold and closes, without a reload', async () => {
    axiosMock.onPatch(PROGRAM_URL).reply(200, { threshold: 10 });
    const input = await openModal();
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual({ threshold: 10 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows an error when saving fails', async () => {
    axiosMock.onPatch(PROGRAM_URL).reply(500);
    const input = await openModal();
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
  });
});
