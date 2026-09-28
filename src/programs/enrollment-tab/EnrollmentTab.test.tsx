import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import EnrollmentTab from './EnrollmentTab';
import { mockLearner, mockPaginatedLearners } from '../data/api.mock';

const mockUseProgramEnrollments = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useProgramEnrollments: (...args: any[]) => mockUseProgramEnrollments(...args),
  // hooks used by child modals — supply minimal stubs
  useLearners: () => ({ data: { results: [], count: 0, numPages: 1 }, isLoading: false, isFetching: false }),
  useEnrollLearner: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const programId = 'prog-key-1';

describe('<EnrollmentTab />', () => {
  beforeEach(() => {
    initializeMocks();
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

  it('offers no way to unenroll a learner', () => {
    render(<EnrollmentTab programId={programId} />);
    expect(screen.queryByRole('button', { name: /Unenroll/i })).not.toBeInTheDocument();
  });

  it('hides "Enroll Learner" when the user may not enroll into this paid program', () => {
    render(<EnrollmentTab programId={programId} canEnroll={false} />);
    expect(screen.queryByRole('button', { name: /Enroll Learner/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Only Rwaq admins can enroll learners/i)).toBeInTheDocument();
  });

  it('opens AddLearnerModal when "Enroll Learner" is clicked', () => {
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Enroll Learner/i }));
    expect(screen.getByText('Enroll Learner in Program')).toBeInTheDocument();
  });
});
