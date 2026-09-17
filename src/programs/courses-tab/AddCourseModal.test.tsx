import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AddCourseModal from './AddCourseModal';
import { mockCourse, mockPaginatedCourses } from '../data/api.mock';

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockAddMutate = jest.fn();
const mockUseCourses = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useCourses: (...args: any[]) => mockUseCourses(...args),
  useAddCourseToProgram: () => ({ mutateAsync: mockAddMutate, isPending: false }),
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  programId: 'prog-key-1',
  programOrg: 'TestOrg',
  alreadyAddedIds: [],
};

describe('<AddCourseModal />', () => {
  beforeEach(() => {
    initializeMocks();
    mockAddMutate.mockResolvedValue(undefined);
    mockUseCourses.mockReturnValue({
      data: mockPaginatedCourses([mockCourse()]),
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders course list when open', () => {
    render(<AddCourseModal {...defaultProps} />);
    expect(screen.getByText('Introduction to CS')).toBeInTheDocument();
  });

  it('shows "Added" badge for already-added course', () => {
    const course = mockCourse({ id: 'already-added' });
    mockUseCourses.mockReturnValue({
      data: mockPaginatedCourses([course]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddCourseModal {...defaultProps} alreadyAddedIds={['already-added']} />);
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Add$/i })).not.toBeInTheDocument();
  });

  it('shows "Add" button for non-added course', () => {
    render(<AddCourseModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^Add$/i })).toBeInTheDocument();
    expect(screen.queryByText('Added')).not.toBeInTheDocument();
  });

  it('calls addCourse with programId and courseId when Add is clicked', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025' });
    mockUseCourses.mockReturnValue({
      data: mockPaginatedCourses([course]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddCourseModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    await waitFor(() => expect(mockAddMutate).toHaveBeenCalledWith({
      programId: 'prog-key-1',
      courseId: 'course-v1:Org+X+2025',
    }));
  });

  it('shows error alert when add mutation rejects', async () => {
    mockAddMutate.mockRejectedValue(new Error('Failed'));
    render(<AddCourseModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(await screen.findByText(/Failed to add course/i)).toBeInTheDocument();
  });

  it('renders pagination when numPages > 1', () => {
    mockUseCourses.mockReturnValue({
      data: mockPaginatedCourses([mockCourse()], { numPages: 3 }),
      isLoading: false,
      isFetching: false,
    });
    render(<AddCourseModal {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /Course list pagination/i })).toBeInTheDocument();
  });

  it('does not render pagination when numPages is 1', () => {
    render(<AddCourseModal {...defaultProps} />);
    expect(screen.queryByRole('navigation', { name: /Course list pagination/i })).not.toBeInTheDocument();
  });
});
