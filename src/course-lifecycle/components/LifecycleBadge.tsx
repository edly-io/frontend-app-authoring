import { Badge } from '@openedx/paragon';

import type { LifecycleState } from '../data/types';

const STATE_CONFIG: Record<LifecycleState, { label: string; variant: string }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  changes_requested: { label: 'Changes Requested', variant: 'danger' },
  for_review: { label: 'Submitted for Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  published: { label: 'Published', variant: 'success' },
};

interface Props {
  state: LifecycleState;
}

export const LifecycleBadge = ({ state }: Props) => {
  const { label, variant } = STATE_CONFIG[state] ?? STATE_CONFIG.draft;
  return (
    <Badge variant={variant} className="lifecycle-badge">
      {label}
    </Badge>
  );
};
