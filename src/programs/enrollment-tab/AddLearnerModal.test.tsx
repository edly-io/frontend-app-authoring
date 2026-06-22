import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AddLearnerModal from './AddLearnerModal';
import { mockLearner, mockPaginatedLearners } from '../data/api.mock';

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockEnrollMutate = jest.fn();
const mockUseLearners = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useLearners: (...args: any[]) => mockUseLearners(...args),
  useEnrollLearner: () => ({ mutateAsync: mockEnrollMutate, isPending: false }),
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  programId: 'prog-key-1',
  alreadyEnrolledIds: [],
};

describe('<AddLearnerModal />', () => {
  beforeEach(() => {
    initializeMocks();
    mockEnrollMutate.mockResolvedValue(undefined);
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([mockLearner()]),
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders learner list when open', () => {
    render(<AddLearnerModal {...defaultProps} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows "Enrolled" badge for already-enrolled learner', () => {
    const learner = mockLearner({ id: 'student.alice', username: 'student.alice' });
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([learner]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddLearnerModal {...defaultProps} alreadyEnrolledIds={['student.alice']} />);
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Enroll$/i })).not.toBeInTheDocument();
  });

  it('shows "Enroll" button for non-enrolled learner', () => {
    render(<AddLearnerModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^Enroll$/i })).toBeInTheDocument();
  });

  it('calls enrollLearner with programId and username when Enroll is clicked', async () => {
    const learner = mockLearner({ id: 'student.alice', username: 'student.alice' });
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([learner]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddLearnerModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
    await waitFor(() => expect(mockEnrollMutate).toHaveBeenCalledWith({
      programId: 'prog-key-1',
      username: 'student.alice',
    }));
  });

  it('shows error alert when enrollment fails', async () => {
    mockEnrollMutate.mockRejectedValue(new Error('Server error'));
    render(<AddLearnerModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
    expect(await screen.findByText(/Failed to enroll learner/i)).toBeInTheDocument();
  });

  it('renders pagination when numPages > 1', () => {
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([mockLearner()], { numPages: 3 }),
      isLoading: false,
      isFetching: false,
    });
    render(<AddLearnerModal {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /Learner list pagination/i })).toBeInTheDocument();
  });

  it('passes enabled=false to useLearners when modal is closed', () => {
    render(<AddLearnerModal {...defaultProps} isOpen={false} />);
    expect(mockUseLearners).toHaveBeenCalledWith(
      expect.any(Object),
      false,
    );
  });
});
