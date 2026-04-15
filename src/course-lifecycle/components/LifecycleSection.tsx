import { useEffect } from 'react';
import { Spinner } from '@openedx/paragon';
import { useQueryClient } from '@tanstack/react-query';

import { useBlockState, lifecycleQueryKeys } from '../data/apiHooks';
import { LifecycleBadge } from './LifecycleBadge';
import { LifecycleActionButtons } from './LifecycleActionButtons';
import { BlockCommentsPanel } from './BlockCommentsPanel';

interface Props {
  usageKey: string;
  title?: string;
  hasChanges?: boolean;
  /** Optional callback forwarded to LifecycleActionButtons — lets the host page react to a publish. */
  onPublishSuccess?: () => void;
}

export const LifecycleSection = ({
  usageKey, title = 'Review Status', hasChanges, onPublishSuccess,
}: Props) => {
  const queryClient = useQueryClient();
  const { data: blockState, isLoading, error } = useBlockState(usageKey);

  // When the unit gains unpublished changes (e.g. a new component was added),
  // the backend signals have already transitioned the block PUBLISHED → DRAFT.
  // Invalidate the cached block state so the sidebar reflects the new state
  // without requiring a page reload.
  useEffect(() => {
    if (hasChanges) {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.blockState(usageKey) });
    }
  }, [hasChanges, usageKey]);

  const effectiveState = (!hasChanges && blockState?.state === 'draft') ? 'published' : blockState?.state;

  return (
    <div className="lifecycle-section my-3 border-top pt-3">
      <h6 className="small font-weight-bold mb-1">{title}</h6>
      {isLoading && <Spinner animation="border" size="sm" className="my-1" />}
      {!isLoading && error && (
        <p className="x-small text-muted mb-0">
          {/* Non-404 means a real backend error; 404 means block not yet in review workflow */}
          {(error as any)?.response?.status === 404
            ? 'Not in review workflow'
            : 'Could not load review status'}
        </p>
      )}
      {!isLoading && blockState && effectiveState && (
        <>
          <LifecycleBadge state={effectiveState} />
          <LifecycleActionButtons
            usageKey={usageKey}
            blockState={blockState}
            hasChanges={hasChanges}
            onPublishSuccess={onPublishSuccess}
          />
          <BlockCommentsPanel usageKey={usageKey} />
        </>
      )}
    </div>
  );
};
