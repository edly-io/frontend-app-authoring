import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import { BlockCommentsPanel } from './BlockCommentsPanel';
import { mockBlockReviewComment } from '../data/api.mock';

const mockUseBlockComments = jest.fn();
const mockResolveMutate = jest.fn();
const mockDeleteMutate = jest.fn();
const mockAddReplyMutate = jest.fn();

jest.mock('@src/course-lifecycle/data/apiHooks', () => ({
  useBlockComments: (...args: any[]) => mockUseBlockComments(...args),
  useResolveComment: () => ({ mutate: mockResolveMutate, isPending: false }),
  useDeleteComment: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useAddReply: () => ({ mutate: mockAddReplyMutate, isPending: false }),
}));

const usageKey = 'block-v1:TestOrg+TestCourse+2025_T1+type@vertical+block@unit1';

/** Expand the Collapsible panel — its body is not rendered until opened. */
const expandPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Comments' }));
};

describe('<BlockCommentsPanel />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseBlockComments.mockReturnValue({ data: [], isLoading: false });
  });

  it('shows loading spinner while fetching comments', () => {
    mockUseBlockComments.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('shows "No comments yet." when comments list is empty', () => {
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders comment author and text', () => {
    const comment = mockBlockReviewComment({ author: 'reviewer', comment: 'Please fix this issue' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByText('reviewer')).toBeInTheDocument();
    expect(screen.getByText('Please fix this issue')).toBeInTheDocument();
  });

  it('shows "Resolve" button for unresolved top-level comment', () => {
    const comment = mockBlockReviewComment({ resolved: false });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });

  it('shows "Resolved" badge and no Resolve button for resolved comment', () => {
    const comment = mockBlockReviewComment({ resolved: true });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('shows "Delete" button for comment authored by the current user (abc123)', () => {
    const comment = mockBlockReviewComment({ author: 'abc123' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('does not show "Delete" button for comment authored by another user', () => {
    const comment = mockBlockReviewComment({ author: 'some_other_user' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('calls resolveMutation.mutate with comment id when Resolve is clicked', () => {
    const comment = mockBlockReviewComment({ id: 42, resolved: false });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(mockResolveMutate).toHaveBeenCalledWith(42);
  });

  it('calls deleteMutation.mutate with comment id when Delete is clicked', () => {
    const comment = mockBlockReviewComment({ id: 42, author: 'abc123' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockDeleteMutate).toHaveBeenCalledWith(42);
  });

  it('does not show standalone Add Comment form', () => {
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Comment' })).not.toBeInTheDocument();
  });

  it('shows a Reply button for each top-level comment', () => {
    const comment = mockBlockReviewComment({ id: 1, commentType: 'requested_change' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });

  it('clicking Reply shows the reply textarea and Add Reply button', () => {
    const comment = mockBlockReviewComment({ id: 1, commentType: 'requested_change' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Reply' })).toBeInTheDocument();
  });

  it('"Add Reply" button is disabled when reply textarea is empty', () => {
    const comment = mockBlockReviewComment({ id: 1, commentType: 'requested_change' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByRole('button', { name: 'Add Reply' })).toBeDisabled();
  });

  it('calls addReplyMutation.mutate with commentId and text when Add Reply is clicked', () => {
    const comment = mockBlockReviewComment({ id: 5, commentType: 'requested_change' });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    fireEvent.change(screen.getByPlaceholderText('Write a reply...'), {
      target: { value: 'I have addressed this' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Reply' }));
    expect(mockAddReplyMutate).toHaveBeenCalledWith(
      { commentId: 5, comment: 'I have addressed this' },
      expect.any(Object),
    );
  });

  it('renders nested replies under their parent comment', () => {
    const reply = mockBlockReviewComment({
      id: 2,
      author: 'staff_user',
      comment: 'Fixed the issue',
      commentType: 'reply',
      parent: 1,
    });
    const comment = mockBlockReviewComment({ id: 1, replies: [reply] });
    mockUseBlockComments.mockReturnValue({ data: [comment], isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByText('Fixed the issue')).toBeInTheDocument();
    expect(screen.getByText('staff_user')).toBeInTheDocument();
  });

  it('renders multiple comments in the panel body', () => {
    const comments = [
      mockBlockReviewComment({ id: 1, comment: 'First comment' }),
      mockBlockReviewComment({ id: 2, comment: 'Second comment' }),
    ];
    mockUseBlockComments.mockReturnValue({ data: comments, isLoading: false });
    render(<BlockCommentsPanel usageKey={usageKey} />);
    expandPanel();
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });
});
