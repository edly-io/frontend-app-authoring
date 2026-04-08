import {
  initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import type { QueryClient } from '@tanstack/react-query';
import { LifecycleSection } from './LifecycleSection';
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

// Inline the lifecycleQueryKeys value — plain objects cannot be referenced before init in hoisted mocks
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

const usageKey = 'block-v1:TestOrg+TestCourse+2025_T1+type@vertical+block@unit1';

let queryClient: QueryClient;

describe('<LifecycleSection />', () => {
  beforeEach(() => {
    const mocks = initializeMocks();
    queryClient = mocks.queryClient;
    mockUseBlockState.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseBlockComments.mockReturnValue({ data: [], isLoading: false });
  });

  it('shows loading spinner while block state is loading', () => {
    mockUseBlockState.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<LifecycleSection usageKey={usageKey} />);
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('shows "Not in review workflow" when API returns 404', () => {
    mockUseBlockState.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { response: { status: 404 } },
    });
    render(<LifecycleSection usageKey={usageKey} />);
    expect(screen.getByText('Not in review workflow')).toBeInTheDocument();
  });

  it('shows "Could not load review status" for non-404 errors', () => {
    mockUseBlockState.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { response: { status: 500 } },
    });
    render(<LifecycleSection usageKey={usageKey} />);
    expect(screen.getByText('Could not load review status')).toBeInTheDocument();
  });

  it('renders the LifecycleBadge with state label when block state is loaded', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'for_review' }),
      isLoading: false,
      error: null,
    });
    render(<LifecycleSection usageKey={usageKey} />);
    expect(screen.getByText('Submitted for Review')).toBeInTheDocument();
  });

  it('shows custom title prop', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'draft' }),
      isLoading: false,
      error: null,
    });
    render(<LifecycleSection usageKey={usageKey} title="My Review Panel" />);
    expect(screen.getByText('My Review Panel')).toBeInTheDocument();
  });

  it('shows effectiveState as "published" when hasChanges=false and state is draft', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'draft' }),
      isLoading: false,
      error: null,
    });
    render(<LifecycleSection usageKey={usageKey} hasChanges={false} />);
    // When there are no changes and state is draft, block is effectively published
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows draft state when hasChanges=true even if state is draft', () => {
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'draft' }),
      isLoading: false,
      error: null,
    });
    render(<LifecycleSection usageKey={usageKey} hasChanges />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('invalidates block state cache when hasChanges changes to true', async () => {
    jest.spyOn(queryClient, 'invalidateQueries');
    mockUseBlockState.mockReturnValue({
      data: mockBlockReviewState({ state: 'published' }),
      isLoading: false,
      error: null,
    });
    const { rerender } = render(<LifecycleSection usageKey={usageKey} hasChanges={false} />);
    rerender(<LifecycleSection usageKey={usageKey} hasChanges />);
    await waitFor(() => {
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['lifecycle', 'block', usageKey, 'state'],
      });
    });
  });
});
