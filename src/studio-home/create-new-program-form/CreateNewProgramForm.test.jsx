import {
  fireEvent,
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';
import CreateNewProgramForm from '.';

const mockCreateProgram = jest.fn();
const mockUseProgramAccess = jest.fn();
const mockUseFbrCities = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../programs/data/apiHooks', () => ({
  useProgramsConfig: () => ({
    data: {
      orgs: [{ id: 1, name: 'FBR Academy', shortName: 'FBR' }],
      programTypes: [{ id: 1, name: 'STP', slug: 'stp' }],
    },
  }),
  useProgramAccess: () => mockUseProgramAccess(),
  useFbrCities: (...args) => mockUseFbrCities(...args),
  useCreateProgram: () => ({
    mutateAsync: mockCreateProgram,
    isPending: false,
  }),
}));

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText('Program name'), {
    target: { value: 'New Program' },
  });
  fireEvent.change(screen.getByLabelText(/Organization/), {
    target: { value: 'FBR' },
  });
  fireEvent.change(screen.getByLabelText(/Program type/), {
    target: { value: 'stp' },
  });
  fireEvent.change(screen.getByLabelText(/Program run/), {
    target: { value: '2026' },
  });
};

describe('<CreateNewProgramForm />', () => {
  beforeEach(() => {
    initializeMocks();
    mockCreateProgram.mockResolvedValue({ id: 'program-v1:FBR+STP+2026' });
    mockUseFbrCities.mockReturnValue({
      data: [
        { id: 1, name: 'Karachi' },
        { id: 2, name: 'Lahore' },
      ],
    });
    mockNavigate.mockReset();
  });

  it('shows cities and submits the selected city for Super Admins', async () => {
    mockUseProgramAccess.mockReturnValue({
      profile: { roles: ['super_admin'] },
    });

    render(<CreateNewProgramForm handleOnClickCancel={jest.fn()} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/City/), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(mockCreateProgram).toHaveBeenCalledWith({
      displayName: 'New Program',
      org: 'FBR',
      programType: 'stp',
      run: '2026',
      cityId: 2,
    }));
    expect(mockUseFbrCities).toHaveBeenCalledWith(true);
  });

  it('requires a city for Super Admins', async () => {
    mockUseProgramAccess.mockReturnValue({
      profile: { roles: ['super_admin'] },
    });

    render(<CreateNewProgramForm handleOnClickCancel={jest.fn()} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('City is required.')).toBeInTheDocument();
    expect(mockCreateProgram).not.toHaveBeenCalled();
  });

  it('does not show or submit city for Middle Admins', async () => {
    mockUseProgramAccess.mockReturnValue({
      profile: { roles: ['middle_admin'] },
    });

    render(<CreateNewProgramForm handleOnClickCancel={jest.fn()} />);
    fillRequiredFields();

    expect(screen.queryByLabelText(/City/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(mockCreateProgram).toHaveBeenCalledWith({
      displayName: 'New Program',
      org: 'FBR',
      programType: 'stp',
      run: '2026',
    }));
    expect(mockUseFbrCities).toHaveBeenCalledWith(false);
  });
});
