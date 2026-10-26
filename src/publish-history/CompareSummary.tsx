import { useIntl } from '@edx/frontend-platform/i18n';
import { Alert, Badge, Button } from '@openedx/paragon';

import { CHANGE_BADGES } from './DiffTree';
import type { ChangeKind, DiffNodeData, DiffResult } from './types';
import messages from './messages';

const COUNT_MESSAGES: Record<ChangeKind, typeof messages.countAdded> = {
  ADDED: messages.countAdded,
  REMOVED: messages.countRemoved,
  CHANGED: messages.countChanged,
  MOVED: messages.countMoved,
};

const NO_CHANGES: Record<ChangeKind, number> = {
  ADDED: 0,
  REMOVED: 0,
  CHANGED: 0,
  MOVED: 0,
};

/** How many listed blocks carry each kind of change (containers without one are not counted). */
const countByKind = (nodes: DiffNodeData[], counts = NO_CHANGES): Record<ChangeKind, number> => (
  nodes.reduce((total, node) =>
    countByKind(
      node.children,
      node.change ? { ...total, [node.change]: total[node.change] + 1 } : total,
    ), counts)
);

interface CompareSummaryProps {
  data: DiffResult;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/** The totals above the tree, the truncation and budget notices, and Expand all / Collapse all. */
const CompareSummary = ({ data, onExpandAll, onCollapseAll }: CompareSummaryProps) => {
  const intl = useIntl();
  const counts = countByKind(data.tree);
  const shown = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return (
    <div className="mb-3">
      <div className="d-flex flex-wrap align-items-center py-2">
        <span className="font-weight-bold mr-3">
          {intl.formatMessage(messages.totalChanges, { count: data.totalChanges })}
        </span>
        {(Object.keys(COUNT_MESSAGES) as ChangeKind[]).filter((kind) => counts[kind] > 0).map((kind) => (
          <Badge key={kind} variant={CHANGE_BADGES[kind].variant} className="mr-2">
            {intl.formatMessage(COUNT_MESSAGES[kind], { count: counts[kind] })}
          </Badge>
        ))}
        <div className="ml-auto">
          <Button variant="tertiary" size="sm" onClick={onExpandAll}>
            {intl.formatMessage(messages.expandAll)}
          </Button>
          <Button variant="tertiary" size="sm" className="ml-2" onClick={onCollapseAll}>
            {intl.formatMessage(messages.collapseAll)}
          </Button>
        </div>
      </div>
      {data.truncated && (
        <Alert variant="warning" className="mt-2 mb-0">
          {intl.formatMessage(messages.truncated, { shown, total: data.totalChanges })}
        </Alert>
      )}
      {data.budgetExhausted && (
        <Alert variant="info" className="mt-2 mb-0">{intl.formatMessage(messages.budgetExhausted)}</Alert>
      )}
    </div>
  );
};

export default CompareSummary;
