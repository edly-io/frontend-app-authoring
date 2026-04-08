import { ModalDialog } from '@openedx/paragon';

import { LifecycleBadge } from './LifecycleBadge';
import { LifecycleActionButtons } from './LifecycleActionButtons';
import { BlockCommentsPanel } from './BlockCommentsPanel';
import { useBlockState } from '../data/apiHooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
  displayName: string;
  hasChanges?: boolean;
  /** Called after a successful lifecycle publish — used to refresh Redux outline state. */
  onPublishSuccess?: () => void;
}

export const LifecycleModal = ({
  isOpen, onClose, blockId, displayName, hasChanges, onPublishSuccess,
}: Props) => {
  const { data: blockState, isLoading } = useBlockState(blockId);

  const effectiveState = (!hasChanges && blockState?.state === 'draft') ? 'published' : blockState?.state;

  return (
    <ModalDialog
      title={`Review Status: ${displayName}`}
      className="lifecycle-modal"
      isOpen={isOpen}
      onClose={onClose}
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>
          {`Review Status: ${displayName}`}
        </ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        {isLoading && <p className="small text-muted">Loading review status...</p>}
        {!isLoading && !blockState && (
          <p className="small text-muted">This block is not in the review workflow.</p>
        )}
        {!isLoading && blockState && effectiveState && (
          <>
            <LifecycleBadge state={effectiveState} />
            <LifecycleActionButtons
              usageKey={blockId}
              blockState={blockState}
              hasChanges={hasChanges}
              onPublishSuccess={() => { onPublishSuccess?.(); onClose(); }}
            />
            <BlockCommentsPanel usageKey={blockId} readOnly={effectiveState === 'published'} />
          </>
        )}
      </ModalDialog.Body>
    </ModalDialog>
  );
};
