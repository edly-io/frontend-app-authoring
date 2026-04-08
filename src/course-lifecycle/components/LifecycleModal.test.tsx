import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import { LifecycleModal } from './LifecycleModal';
import { mockBlockReviewState } from '../data/api.mock';

const mockUseBlockState = jest.fn();

// Mocks for LifecycleActionButtons child
const mockSubmitMutate = jest.fn();
const mockApproveMutate = jest.fn();
const mockRequestChangesMutate = jest.fn();
const mockPublishMutate = jest.fn();

// Mocks for BlockCommentsPanel child
const mockUseBlockComments = jest.fn();
const mockCreateMutate = jest.fn();
const mockResolveMutate = jest.fn();
const mockDeleteMutate = jest.fn();

jest.mock('@src/course-lifecycle/data/apiHooks', () => ({
  useBlockState: (...args: any[]) => mockUseBlockState(...args),
  lifecycleQueryKeys: {
    blockState: (key: string) => ['lifecycle', 'block', key, 'state'],
  },
  useSubmitForReview: () => ({ mutate: mockSubmitMutate, isPending: false }),
  useApproveBlock: () => ({ mutate: mockApproveMutate, isPending: false }),
  useRequestChanges: () => ({ mutate: mockRequestChangesMutate, isPending: false }),
  usePublishBlock: () => ({ mutate: mockPublishMutate, isPending: false }),
  useBlockComments: (...args: any[]) => mockUseBlockComments(...args),
  useCreateComment: () => ({ mutate: mockCreateMutate, isPending: false }),
  useResolveComment: () => ({ mutate: mockResolveMutate, isPending: false }),
  useDeleteComment: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

const blockId = 'block-v1:TestOrg+TestCourse+2025_T1+type@vertical+block@unit1';
const displayName = 'Introduction Unit';

describe('<LifecycleModal />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseBlockState.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseBlockComments.mockReturnValue({ data: [], isLoading: false });
  });

  it('does not render modal content when isOpen=false', () => {
    render(
      <LifecycleModal isOpen={false} onClose={jest.fn()} blockId={blockId} displayName={displayName} />,
    );
    expect(screen.queryByText(`Review Status: ${displayName}`)).not.toBeInTheDocument();
  });

  it('renders modal title when isOpen=true', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'draft' }),
      isLoading: false,
      error: null,
    });
    render(
      <LifecycleModal isOpen onClose={jest.fn()} blockId={blockId} displayName={displayName} />,
    );
    expect(screen.getByText(`Review Status: ${displayName}`)).toBeInTheDocument();
  });

  it('shows loading message while block state is fetching', () => {
    mockUseBlockState.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(
      <LifecycleModal isOpen onClose={jest.fn()} blockId={blockId} displayName={displayName} />,
    );
    expect(screen.getByText('Loading review status...')).toBeInTheDocument();
  });

  it('shows "not in review workflow" message when blockState is null', () => {
    mockUseBlockState.mockReturnValue({ data: null, isLoading: false, error: null });
    render(
      <LifecycleModal isOpen onClose={jest.fn()} blockId={blockId} displayName={displayName} />,
    );
    expect(screen.getByText('This block is not in the review workflow.')).toBeInTheDocument();
  });

  it('renders LifecycleBadge with state label when block state is loaded', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'approved' }),
      isLoading: false,
      error: null,
    });
    render(
      <LifecycleModal isOpen onClose={jest.fn()} blockId={blockId} displayName={displayName} />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('shows effectiveState as "published" when hasChanges=false and state=draft', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'draft' }),
      isLoading: false,
      error: null,
    });
    render(
      <LifecycleModal isOpen onClose={jest.fn()} blockId={blockId} displayName={displayName} hasChanges={false} />,
    );
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('calls onClose when the modal close button is clicked', () => {
    const onClose = jest.fn();
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'draft', canSubmit: false }),
      isLoading: false,
      error: null,
    });
    render(
      <LifecycleModal isOpen onClose={onClose} blockId={blockId} displayName={displayName} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
