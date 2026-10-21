import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge } from '@openedx/paragon';

import FieldChange from './FieldChange';
import type { ChangeKind, DiffNodeData } from './types';
import messages from './messages';
import { userName } from './utils';

const CHANGE_BADGES: Record<ChangeKind, { variant: string; message: typeof messages.changeAdded; }> = {
  ADDED: { variant: 'success', message: messages.changeAdded },
  REMOVED: { variant: 'danger', message: messages.changeRemoved },
  CHANGED: { variant: 'warning', message: messages.changeChanged },
  MOVED: { variant: 'info', message: messages.changeMoved },
};

const DiffNode = ({ node }: { node: DiffNodeData; }) => {
  const intl = useIntl();
  const badge = node.change ? CHANGE_BADGES[node.change] : null;
  const user = userName(intl, node.editor);
  const movedAmongSiblings = node.move
    && node.move.fromParent === node.move.toParent
    && node.move.fromIndex !== null
    && node.move.toIndex !== null;
  return (
    <li className="mt-3" data-testid={`diff-node-${node.usageKey}`}>
      <div className="d-flex flex-wrap align-items-center">
        {badge && <Badge variant={badge.variant} className="mr-2">{intl.formatMessage(badge.message)}</Badge>}
        <span className="text-gray-700 small mr-2">{node.blockType}</span>
        <strong className="text-break" title={node.usageKey}>{node.displayName || node.usageKey}</strong>
      </div>
      {badge && (
        <div className="small text-gray-700">
          {intl.formatMessage(node.editorApproximate ? messages.editedByApproximate : messages.editedBy, { user })}
        </div>
      )}
      {node.move && (
        <div className="small text-gray-700">
          {movedAmongSiblings
            ? intl.formatMessage(messages.movedFrom, {
              from: (node.move.fromIndex as number) + 1,
              to: (node.move.toIndex as number) + 1,
            })
            : intl.formatMessage(messages.movedParent)}
        </div>
      )}
      {node.fields.map((field) => <FieldChange key={`${field.scope}-${field.name}`} field={field} />)}
      {node.children.length > 0 && <DiffTree nodes={node.children} />}
    </li>
  );
};

/** The changed blocks as a tree (sections, subsections, units, blocks); a block that only holds changes has no badge. */
const DiffTree = ({ nodes, label }: { nodes: DiffNodeData[]; label?: string; }) => (
  <ul className="publish-history-diff" aria-label={label}>
    {nodes.map((node) => <DiffNode key={node.usageKey} node={node} />)}
  </ul>
);

export default DiffTree;
