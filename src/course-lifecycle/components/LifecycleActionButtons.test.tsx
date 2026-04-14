import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import { LifecycleActionButtons } from './LifecycleActionButtons';
import { mockBlockReviewState } from '../data/api.mock';

const mockSubmitMutate = jest.fn();
const mockApproveMutate = jest.fn();
const mockRequestChangesMutate = jest.fn();
const mockPublishMutate = jest.fn();

jest.mock('@src/course-lifecycle/data/apiHooks', () => ({
  useSubmitForReview: () => ({ mutate: mockSubmitMutate, isPending: false }),
  useApproveBlock: () => ({ mutate: mockApproveMutate, isPending: false }),
  useRequestChanges: () => ({ mutate: mockRequestChangesMutate, isPending: false }),
  usePublishBlock: () => ({ mutate: mockPublishMutate, isPending: false }),
}));

const usageKey = 'block-v1:TestOrg+TestCourse+2025_T1+type@vertical+block@unit1';

describe('<LifecycleActionButtons />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders no buttons when all capability flags are false', () => {
    const blockState = mockBlockReviewState({
      canSubmit: false, canApprove: false, canRequestChanges: false, canPublish: false,
    });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('renders no buttons when hasChanges=false and canPublish=false', () => {
    const blockState = mockBlockReviewState({
      canSubmit: true, canApprove: false, canRequestChanges: false, canPublish: false,
    });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} hasChanges={false} />);
    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('renders "Submit for Review" button when canSubmit=true', () => {
    const blockState = mockBlockReviewState({ canSubmit: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    expect(screen.getByRole('button', { name: 'Submit for Review' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('renders "Approve" button when canApprove=true', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canApprove: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
  });

  it('renders "Request Changes" button when canRequestChanges=true', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canRequestChanges: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeInTheDocument();
  });

  it('renders "Publish" button when canPublish=true', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canPublish: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('hides workflow buttons but shows Publish when hasChanges=false and canPublish=true', () => {
    const blockState = mockBlockReviewState({ canSubmit: true, canPublish: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} hasChanges={false} />);
    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('calls submitMutation.mutate() when Submit for Review button is clicked', () => {
    const blockState = mockBlockReviewState({ canSubmit: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));
    expect(mockSubmitMutate).toHaveBeenCalledTimes(1);
  });

  it('calls approveMutation.mutate() when Approve button is clicked', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canApprove: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(mockApproveMutate).toHaveBeenCalledTimes(1);
  });

  it('calls publishMutation.mutate() when Publish button is clicked', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canPublish: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(mockPublishMutate).toHaveBeenCalledTimes(1);
  });

  it('clicking "Request Changes" shows the inline comment form', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canRequestChanges: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    expect(screen.getByPlaceholderText('Describe the changes needed...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('"Submit Changes" button is disabled when textarea is empty', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canRequestChanges: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    expect(screen.getByRole('button', { name: 'Submit Changes' })).toBeDisabled();
  });

  it('calls requestChangesMutation.mutate() with comment when Submit Changes is clicked', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canRequestChanges: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    fireEvent.change(
      screen.getByPlaceholderText('Describe the changes needed...'),
      { target: { value: 'Please fix the introduction section' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit Changes' }));
    expect(mockRequestChangesMutate).toHaveBeenCalledWith(
      ['Please fix the introduction section'],
      expect.any(Object),
    );
  });

  it('Cancel hides the request changes form', () => {
    const blockState = mockBlockReviewState({ canSubmit: false, canRequestChanges: true });
    render(<LifecycleActionButtons usageKey={usageKey} blockState={blockState} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
    expect(screen.getByPlaceholderText('Describe the changes needed...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Describe the changes needed...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeInTheDocument();
  });
});
