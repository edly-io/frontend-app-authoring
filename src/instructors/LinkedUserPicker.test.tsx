import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import { useSearchInstructorUsers } from './data/apiHooks';
import CreateNewInstructorForm from '../studio-home/create-new-instructor-form';
import LinkedUserPicker from './LinkedUserPicker';

jest.mock('./data/apiHooks', () => ({
  useSearchInstructorUsers: jest.fn(),
  useCreateInstructor: jest.fn(),
}));

const amina = {
  id: 7, username: 'amina', name: 'Amina Khan', email: 'amina@example.com', linked: false,
};
const omar = {
  id: 8, username: 'omar', name: 'Omar Ali', linked: true,
};

describe('<LinkedUserPicker />', () => {
  beforeEach(() => {
    initializeMocks();
    (useSearchInstructorUsers as jest.Mock).mockImplementation((term: string) => ({
      data: term.trim() ? [amina, omar] : [],
    }));
  });

  it('lists the users found and marks the ones already linked', async () => {
    render(<LinkedUserPicker selected={null} onSelect={jest.fn()} onClear={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Search active users'), { target: { value: 'a' } });

    expect(await screen.findByText('Amina Khan (amina)')).toBeInTheDocument();
    expect(screen.getByText(/Omar Ali \(omar\).*already linked/)).toBeInTheDocument();
  });

  it('does not list anything for an empty search', () => {
    render(<LinkedUserPicker selected={null} onSelect={jest.fn()} onClear={jest.fn()} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reports the chosen user', async () => {
    const onSelect = jest.fn();
    render(<LinkedUserPicker selected={null} onSelect={onSelect} onClear={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Search active users'), { target: { value: 'ami' } });
    fireEvent.click(await screen.findByText('Amina Khan (amina)'));

    expect(onSelect).toHaveBeenCalledWith(amina);
  });

  it('shows the linked user name and email read-only, lets it be cleared and shows an error', () => {
    const onClear = jest.fn();
    render(
      <LinkedUserPicker
        selected={{
          id: 7, username: 'amina', name: 'Amina Khan', email: 'amina@example.com',
        }}
        onSelect={jest.fn()}
        onClear={onClear}
        error="This user is already linked to another instructor."
      />,
    );

    const name = screen.getByDisplayValue('Amina Khan');
    const email = screen.getByDisplayValue('amina@example.com');
    expect(name).toHaveAttribute('readonly');
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByText('This user is already linked to another instructor.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear linked user'));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('<CreateNewInstructorForm /> user link', () => {
  const createInstructor = jest.fn();

  beforeEach(() => {
    initializeMocks();
    createInstructor.mockReset().mockResolvedValue({ id: 99 });
    // eslint-disable-next-line global-require
    (require('./data/apiHooks').useCreateInstructor as jest.Mock).mockReturnValue({
      mutateAsync: createInstructor,
      isPending: false,
    });
    (useSearchInstructorUsers as jest.Mock).mockImplementation((term: string) => ({
      data: term.trim() ? [amina] : [],
    }));
  });

  it('cannot create until a user is picked and has no name field to type in', () => {
    render(<CreateNewInstructorForm handleOnClickCancel={jest.fn()} />);

    expect(screen.queryByRole('textbox', { name: /instructor name/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('shows the chosen user name and email read-only and creates the instructor with that user', async () => {
    render(<CreateNewInstructorForm handleOnClickCancel={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Search active users'), { target: { value: 'ami' } });
    fireEvent.click(await screen.findByText('Amina Khan (amina)'));

    expect(screen.getByDisplayValue('Amina Khan')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('amina@example.com')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(createInstructor).toHaveBeenCalledWith({ user: 7 }));
  });
});
