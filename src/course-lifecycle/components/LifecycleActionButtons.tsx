import { Button, Form, Spinner } from '@openedx/paragon';

import type { BlockReviewState } from '../data/types';
import {
  useApproveBlock,
  useRequestChanges,
  useSubmitForReview,
} from '../data/apiHooks';
import { useRequestChangesForm } from '../hooks';

interface Props {
  usageKey: string;
  blockState: BlockReviewState;
  hasChanges?: boolean;
}

export const LifecycleActionButtons = ({
  usageKey, blockState, hasChanges,
}: Props) => {
  const submitMutation = useSubmitForReview(usageKey);
  const approveMutation = useApproveBlock(usageKey);
  const requestChangesMutation = useRequestChanges(usageKey);

  const {
    showRequestForm, requestComment, setRequestComment, open, cancel, submit,
  } = useRequestChangesForm(requestChangesMutation);

  const {
    canSubmit, canApprove, canRequestChanges,
  } = blockState;

  const showWorkflowButtons = hasChanges !== false;

  if (!showWorkflowButtons) {
    return null;
  }

  if (!canSubmit && !canApprove && !canRequestChanges) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-1 mt-2">
      {showWorkflowButtons && canSubmit && (
        <Button
          variant="outline-primary"
          size="sm"
          className="w-100 my-1"
          disabled={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Submit for Review'}
        </Button>
      )}
      {showWorkflowButtons && canApprove && (
        <Button
          variant="success"
          size="sm"
          className="w-100 my-1"
          disabled={approveMutation.isPending}
          onClick={() => approveMutation.mutate()}
        >
          {approveMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Approve & Publish'}
        </Button>
      )}
      {showWorkflowButtons && canRequestChanges && !showRequestForm && (
        <Button
          variant="outline-danger"
          size="sm"
          className="w-100 my-1"
          onClick={open}
        >
          Request Changes
        </Button>
      )}
      {showWorkflowButtons && canRequestChanges && showRequestForm && (
        <div className="mt-1">
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Describe the changes needed..."
            value={requestComment}
            onChange={(e) => setRequestComment(e.target.value)}
            className="mb-2"
          />
          <div className="d-flex gap-1">
            <Button variant="outline-secondary" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!requestComment.trim() || requestChangesMutation.isPending}
              onClick={submit}
            >
              {requestChangesMutation.isPending
                ? <Spinner animation="border" size="sm" />
                : 'Submit Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
