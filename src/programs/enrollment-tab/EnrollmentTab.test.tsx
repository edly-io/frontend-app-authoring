import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import EnrollmentTab from './EnrollmentTab';
import { mockLearner, mockPaginatedLearners } from '../data/api.mock';

const mockUnenrollMutate = jest.fn();
const mockUseProgramEnrollments = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useProgramEnrollments: (...args: any[]) => mockUseProgramEnrollments(...args),
  useUnenrollLearner: () => ({ mutateAsync: mockUnenrollMutate, isPending: false }),
  // hooks used by child modals — supply minimal stubs
  useLearners: () => ({ data: { results: [], count: 0, numPages: 1 }, isLoading: false, isFetching: false }),
  useEnrollLearner: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useBatches: () => ({ data: [], isLoading: false }),
  useBatchUsers: () => ({ data: [], isLoading: false }),
}));

const programId = 'prog-key-1';

describe('<EnrollmentTab />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUnenrollMutate.mockResolvedValue(undefined);
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([mockLearner()]),
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders enrolled learner list with name and email', () => {
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('hides enrollment management actions in read-only mode', () => {
    render(<EnrollmentTab programId={programId} canManage={false} />);

    expect(screen.queryByRole('button', { name: /Enroll Learner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enroll Batch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Unenroll/i })).not.toBeInTheDocument();
  });

  it('shows empty state message when no learners enrolled', () => {
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([], { count: 0 }),
      isLoading: false,
      isFetching: false,
    });
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByText(/No learners enrolled yet/i)).toBeInTheDocument();
  });

  it('renders search field', () => {
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByPlaceholderText(/Search enrolled learners/i)).toBeInTheDocument();
  });

  it('passes search query to useProgramEnrollments', () => {
    render(<EnrollmentTab programId={programId} />);
    const searchInput = screen.getByPlaceholderText(/Search enrolled learners/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(mockUseProgramEnrollments).toHaveBeenCalledWith(
      programId,
      expect.objectContaining({ search: 'alice' }),
    );
  });

  it('opens confirmation dialog when Unenroll is clicked', () => {
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Unenroll/i }));
    expect(screen.getByText('Unenroll Learner?')).toBeInTheDocument();
  });

  it('shows learner name in confirmation dialog', () => {
    const learner = mockLearner({ name: 'Bob Jones', username: 'bob.jones' });
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([learner]),
      isLoading: false,
      isFetching: false,
    });
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Unenroll/i }));
    // Name appears in dialog heading — findAllByText handles > 1 match (row + dialog)
    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThanOrEqual(1);
  });

  it('shows bold warning text in confirmation dialog', () => {
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Unenroll/i }));
    const warning = screen.getByText(/All enrollment data will be lost/i);
    expect(warning.tagName).toBe('STRONG');
  });

  it('calls unenrollMutate with programId and username when confirm is clicked', async () => {
    const learner = mockLearner({ username: 'student.alice' });
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([learner]),
      isLoading: false,
      isFetching: false,
    });
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Unenroll/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Unenroll$/i }));
    await waitFor(() => expect(mockUnenrollMutate).toHaveBeenCalledWith({
      programId,
      username: 'student.alice',
    }));
  });

  it('opens AddLearnerModal when "Enroll Learner" is clicked', () => {
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Enroll Learner/i }));
    expect(screen.getByText('Enroll Learner in Program')).toBeInTheDocument();
  });
});
