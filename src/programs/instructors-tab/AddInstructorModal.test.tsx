import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AddInstructorModal from './AddInstructorModal';
import { mockInstructor } from '../data/api.mock';
import type { Instructor } from '../data/types';

const mockAddMutate = jest.fn();
const mockUseInstructors = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useInstructors: (...args: any[]) => mockUseInstructors(...args),
  useAddInstructorToCourse: () => ({ mutateAsync: mockAddMutate, isPending: false }),
}));

// Helper: convert Instructor to the PaginatedLearners shape the hook returns
const instructorPage = (instructors: Instructor[]) => ({
  results: instructors.map((i) => ({
    id: i.username, username: i.username, email: i.email, name: i.name,
  })),
  count: instructors.length,
  numPages: 1,
});

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  courseId: 'course-v1:Org+X+2025',
  courseName: 'CS 101',
  alreadyAddedEmails: [],
};

describe('<AddInstructorModal />', () => {
  beforeEach(() => {
    initializeMocks();
    mockAddMutate.mockResolvedValue(undefined);
    mockUseInstructors.mockReturnValue({
      data: instructorPage([mockInstructor()]),
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders instructor list when open', () => {
    render(<AddInstructorModal {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows "Added" badge for already-added instructor', () => {
    mockUseInstructors.mockReturnValue({
      data: instructorPage([mockInstructor({ email: 'john@example.com' })]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddInstructorModal {...defaultProps} alreadyAddedEmails={['john@example.com']} />);
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Add$/i })).not.toBeInTheDocument();
  });

  it('shows "Add" button for non-added instructor', () => {
    render(<AddInstructorModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^Add$/i })).toBeInTheDocument();
  });

  it('calls addInstructor with courseId and email when Add is clicked', async () => {
    mockUseInstructors.mockReturnValue({
      data: instructorPage([mockInstructor({ email: 'jane@example.com' })]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddInstructorModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    await waitFor(() => expect(mockAddMutate).toHaveBeenCalledWith({
      courseId: 'course-v1:Org+X+2025',
      email: 'jane@example.com',
    }));
  });

  it('shows error alert when mutation rejects', async () => {
    mockAddMutate.mockRejectedValue(new Error('Network error'));
    render(<AddInstructorModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(await screen.findByText(/Failed to add instructor/i)).toBeInTheDocument();
  });

  it('renders pagination when numPages > 1', () => {
    mockUseInstructors.mockReturnValue({
      data: { ...instructorPage([mockInstructor()]), numPages: 3 },
      isLoading: false,
      isFetching: false,
    });
    render(<AddInstructorModal {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /Instructor list pagination/i })).toBeInTheDocument();
  });

  it('passes enabled=false to useInstructors when modal is closed', () => {
    render(<AddInstructorModal {...defaultProps} isOpen={false} />);
    expect(mockUseInstructors).toHaveBeenCalledWith(
      expect.any(Object),
      false,
    );
  });
});
