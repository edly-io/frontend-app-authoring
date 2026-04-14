import { useState } from 'react';
import { Button, Form, Spinner } from '@openedx/paragon';

import type { BlockReviewState } from '../data/types';
import {
  useApproveBlock,
  usePublishBlock,
  useRequestChanges,
  useSubmitForReview,
} from '../data/apiHooks';

interface Props {
  usageKey: string;
  blockState: BlockReviewState;
  hasChanges?: boolean;
  /** Called after a successful lifecycle publish — used by the unit page to refresh its Redux state. */
  onPublishSuccess?: () => void;
}

export const LifecycleActionButtons = ({
  usageKey, blockState, hasChanges, onPublishSuccess,
}: Props) => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestComment, setRequestComment] = useState('');

  const submitMutation = useSubmitForReview(usageKey);
  const approveMutation = useApproveBlock(usageKey);
  const requestChangesMutation = useRequestChanges(usageKey);
  const publishMutation = usePublishBlock(usageKey, { onSuccess: onPublishSuccess });

  const {
    canSubmit, canApprove, canRequestChanges, canPublish,
  } = blockState;

  // When there are no pending changes, workflow buttons (submit/approve/request-changes)
  // are irrelevant, but the Publish button must still show if the block is approved.
  const showWorkflowButtons = hasChanges !== false;

  if (!showWorkflowButtons && !canPublish) {
    return null;
  }

  if (!canSubmit && !canApprove && !canRequestChanges && !canPublish) {
    return null;
  }

  const handleSubmitChanges = () => {
    const trimmed = requestComment.trim();
    if (!trimmed) { return; }
    requestChangesMutation.mutate([trimmed], {
      onSuccess: () => {
        setShowRequestForm(false);
        setRequestComment('');
      },
    });
  };

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
          {approveMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Approve'}
        </Button>
      )}
      {showWorkflowButtons && canRequestChanges && !showRequestForm && (
        <Button
          variant="outline-danger"
          size="sm"
          className="w-100 my-1"
          onClick={() => setShowRequestForm(true)}
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
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                setShowRequestForm(false);
                setRequestComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!requestComment.trim() || requestChangesMutation.isPending}
              onClick={handleSubmitChanges}
            >
              {requestChangesMutation.isPending
                ? <Spinner animation="border" size="sm" />
                : 'Submit Changes'}
            </Button>
          </div>
        </div>
      )}
      {canPublish && (
        <Button
          variant="success"
          size="sm"
          className="w-100 my-1"
          disabled={publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
        >
          {publishMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Publish'}
        </Button>
      )}
    </div>
  );
};
