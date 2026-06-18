import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import { CourseCommentsPanel } from './CourseCommentsPanel';
import { mockBlockReviewComment } from '../data/api.mock';

const mockUseCourseComments = jest.fn();
const mockResolveComment = jest.fn();
const mockDeleteComment = jest.fn();
const mockAddCourseReplyMutate = jest.fn();

jest.mock('@src/course-lifecycle/data/apiHooks', () => ({
  useCourseComments: (...args: any[]) => mockUseCourseComments(...args),
  useAddCourseReply: () => ({ mutate: mockAddCourseReplyMutate, isPending: false }),
  lifecycleQueryKeys: {
    courseComments: (id: string) => ['lifecycle', 'course', id, 'comments'],
  },
}));

jest.mock('@src/course-lifecycle/data/api', () => ({
  resolveComment: (...args: any[]) => mockResolveComment(...args),
  deleteComment: (...args: any[]) => mockDeleteComment(...args),
}));

const courseId = 'course-v1:TestOrg+TestCourse+2025_T1';

/** Expand the Collapsible panel — its body is not rendered until opened. */
const expandPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Comments' }));
};

describe('<CourseCommentsPanel />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseCourseComments.mockReturnValue({ data: [], isLoading: false });
    mockResolveComment.mockResolvedValue({ id: 1, resolved: true });
    mockDeleteComment.mockResolvedValue(undefined);
  });

  it('shows loading spinner while fetching comments', () => {
    mockUseCourseComments.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('shows "No comments yet." when comments list is empty', () => {
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders comment author and text', () => {
    const comment = mockBlockReviewComment({ author: 'admin', comment: 'Course needs more examples' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Course needs more examples')).toBeInTheDocument();
  });

  it('shows "Resolve" button for unresolved comment', () => {
    const comment = mockBlockReviewComment({ resolved: false });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });

  it('shows "Resolved" badge and no Resolve button for resolved comment', () => {
    const comment = mockBlockReviewComment({ resolved: true });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('shows "Delete" button for comment authored by the current user', () => {
    const comment = mockBlockReviewComment({ author: 'abc123' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows "Delete" button for another user comment because Instructor+ may moderate comments', () => {
    const comment = mockBlockReviewComment({ author: 'another_user' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls resolveComment api when Resolve is clicked', async () => {
    const comment = mockBlockReviewComment({ id: 7, resolved: false });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(mockResolveComment).toHaveBeenCalledWith(7));
  });

  it('calls deleteComment api when Delete is clicked', async () => {
    const comment = mockBlockReviewComment({ id: 7, author: 'abc123' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mockDeleteComment).toHaveBeenCalledWith(7));
  });

  it('does not show standalone Add Comment form', () => {
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Comment' })).not.toBeInTheDocument();
  });

  it('shows a Reply button for each top-level comment', () => {
    const comment = mockBlockReviewComment({ id: 1, commentType: 'requested_change' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });

  it('clicking Reply shows the reply textarea and Add Reply button', () => {
    const comment = mockBlockReviewComment({ id: 1, commentType: 'requested_change' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Reply' })).toBeInTheDocument();
  });

  it('calls addCourseReplyMutation.mutate with commentId and text when Add Reply is clicked', () => {
    const comment = mockBlockReviewComment({ id: 5, commentType: 'requested_change' });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    fireEvent.change(screen.getByPlaceholderText('Write a reply...'), {
      target: { value: 'Updated the course description' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Reply' }));
    expect(mockAddCourseReplyMutate).toHaveBeenCalledWith(
      { commentId: 5, comment: 'Updated the course description' },
      expect.any(Object),
    );
  });

  it('renders nested replies under their parent comment', () => {
    const reply = mockBlockReviewComment({
      id: 2,
      author: 'staff_user',
      comment: 'Done, added more examples',
      commentType: 'reply',
      parent: 1,
    });
    const comment = mockBlockReviewComment({ id: 1, replies: [reply] });
    mockUseCourseComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<CourseCommentsPanel courseId={courseId} />);
    expandPanel();
    expect(screen.getByText('Done, added more examples')).toBeInTheDocument();
    expect(screen.getByText('staff_user')).toBeInTheDocument();
  });
});
