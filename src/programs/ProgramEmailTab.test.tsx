import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import ProgramEmailTab from './ProgramEmailTab';

jest.mock('../generic/RichTextEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="Message" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

it('shows the recipient count and asks for confirmation before sending', async () => {
  const { axiosMock } = initializeMocks();
  axiosMock.onGet(/email-recipients/).reply(200, { count: 1, skipped_count: 0 });
  axiosMock.onGet(/\/emails\//).reply(200, []);
  axiosMock.onPost(/\/emails\//).reply(201, {});
  render(<ProgramEmailTab programId="program-v1:org+type+run" />);
  expect(await screen.findByText('1 recipients, 0 opted out')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Hello' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Welcome' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send email' }));
  expect(axiosMock.history.post).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm send' }));
  await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
  expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({ subject: 'Hello', body: 'Welcome', recipients: 'myself' });
});
