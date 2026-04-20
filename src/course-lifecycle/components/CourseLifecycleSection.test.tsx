import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import { CourseLifecycleSection } from './CourseLifecycleSection';
import { mockCourseAggregateState } from '../data/api.mock';

const mockUseCourseAggregateState = jest.fn();
const mockSubmitCourseMutate = jest.fn();
const mockApproveCourseMutate = jest.fn();
const mockRequestCourseChangesMutate = jest.fn();

jest.mock('@src/course-lifecycle/data/apiHooks', () => ({
  useCourseAggregateState: (...args: any[]) => mockUseCourseAggregateState(...args),
  useSubmitCourseForReview: () => ({ mutate: mockSubmitCourseMutate, isPending: false }),
  useApproveCourse: () => ({ mutate: mockApproveCourseMutate, isPending: false }),
  useRequestCourseChanges: () => ({ mutate: mockRequestCourseChangesMutate, isPending: false }),
  // useCourseComments + useAddCourseReply needed by CourseCommentsPanel child
  useCourseComments: () => ({ data: [], isLoading: false }),
  useAddCourseReply: () => ({ mutate: jest.fn(), isPending: false }),
  lifecycleQueryKeys: {
    courseComments: (id: string) => ['lifecycle', 'course', id, 'comments'],
  },
}));

jest.mock('@src/course-lifecycle/data/api', () => ({
  resolveComment: jest.fn().mockResolvedValue({}),
  deleteComment: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@src/course-outline/data/thunk', () => ({
  fetchCourseOutlineIndexQuery: jest.fn(() => ({ type: 'MOCK_FETCH_OUTLINE' })),
}));

const courseId = 'course-v1:TestOrg+TestCourse+2025_T1';

describe('<CourseLifecycleSection />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseCourseAggregateState.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it('shows loading spinner while data is loading', () => {
    mockUseCourseAggregateState.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<CourseLifecycleSection courseId={courseId} />);
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('shows "not enrolled in review workflow" when there is an error', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByText(/not enrolled in the review workflow/i)).toBeInTheDocument();
  });

  it('shows "not enrolled in review workflow" when data is null', () => {
    mockUseCourseAggregateState.mockReturnValue({ data: null, isLoading: false, error: null });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByText(/not enrolled in the review workflow/i)).toBeInTheDocument();
  });

  it('renders LifecycleBadge with the course aggregate state', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ aggregateState: 'for_review' }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByText('Submitted for Review')).toBeInTheDocument();
  });

  it('renders block count breakdown badges for non-zero states', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({
        blockCounts: {
          draft: 3, for_review: 1, approved: 2, published: 0,
        },
      }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByText('3 Draft')).toBeInTheDocument();
    expect(screen.getByText('1 For Review')).toBeInTheDocument();
    expect(screen.getByText('2 Approved')).toBeInTheDocument();
  });

  it('does not render block count badge for states with zero count', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({
        blockCounts: {
          draft: 0, for_review: 0, approved: 0, published: 5,
        },
      }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.queryByText(/0 Draft/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 For Review/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 Approved/)).not.toBeInTheDocument();
  });

  it('renders "Submit All for Review" button when canSubmit=true', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByRole('button', { name: 'Submit All for Review' })).toBeInTheDocument();
  });

  it('renders "Approve & Publish All" button when canApprove=true', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: false, canApprove: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByRole('button', { name: 'Approve & Publish All' })).toBeInTheDocument();
  });

  it('renders "Request Changes" button when canRequestChanges=true', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: false, canRequestChanges: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeInTheDocument();
  });

  it('clicking "Request Changes" shows the inline comment form', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: false, canRequestChanges: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    expect(screen.getByPlaceholderText('Describe the changes needed...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Changes' })).toBeInTheDocument();
  });

  it('calls requestChangesMutation.mutate() with comments when Submit Changes is clicked', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: false, canRequestChanges: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    fireEvent.change(
      screen.getByPlaceholderText('Describe the changes needed...'),
      { target: { value: 'Please revise the intro' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit Changes' }));
    expect(mockRequestCourseChangesMutate).toHaveBeenCalledWith(
      ['Please revise the intro'],
      expect.any(Object),
    );
  });

  it('does not render action buttons when no action is allowed', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({
        canSubmit: false, canApprove: false, canRequestChanges: false, canPublish: false,
      }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    expect(screen.queryByRole('button', { name: 'Submit All for Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve & Publish All' })).not.toBeInTheDocument();
  });

  it('calls submitMutation.mutate() when Submit All for Review is clicked', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit All for Review' }));
    expect(mockSubmitCourseMutate).toHaveBeenCalledTimes(1);
  });

  it('calls approveMutation.mutate() when Approve & Publish All is clicked', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState({ canSubmit: false, canApprove: true }),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve & Publish All' }));
    expect(mockApproveCourseMutate).toHaveBeenCalledTimes(1);
  });

  it('renders the CourseCommentsPanel when data is loaded', () => {
    mockUseCourseAggregateState.mockReturnValue({
      data: mockCourseAggregateState(),
      isLoading: false,
      error: null,
    });
    render(<CourseLifecycleSection courseId={courseId} />);
    // CourseCommentsPanel renders its trigger with "Comments" text
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });
});
