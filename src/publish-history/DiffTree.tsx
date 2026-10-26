import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge,
  Button,
  Col,
  Collapsible,
  Icon,
  OverlayTrigger,
  Row,
  Tooltip,
} from '@openedx/paragon';

import { getItemIcon } from '@src/generic/block-type-utils';

import FieldChange from './FieldChange';
import type { Age, ChangeKind, DiffNodeData } from './types';
import messages from './messages';
import { userName } from './utils';

export const CHANGE_BADGES: Record<ChangeKind, { variant: string; message: typeof messages.changeAdded; }> = {
  ADDED: { variant: 'success', message: messages.changeAdded },
  REMOVED: { variant: 'danger', message: messages.changeRemoved },
  CHANGED: { variant: 'warning', message: messages.changeChanged },
  MOVED: { variant: 'info', message: messages.changeMoved },
};

/** Sections, subsections and units: shown as collapsible groups, never previewed. */
const CONTAINER_TYPES = new Set(['course', 'chapter', 'sequential', 'vertical']);

/** Blocks whose learner view picks random children, so two previews of them may differ. */
const RANDOM_TYPES = new Set(['library_content', 'itembank']);

/** Expand all / Collapse all: each press bumps `version`, and every group then takes `open`. */
export interface ExpandSignal {
  open: boolean;
  version: number;
}

interface TreeContextValue {
  columns: [Age, Age];
  expand: ExpandSignal;
  onPreview?: (node: DiffNodeData) => void;
}

const NEVER_EXPANDED: ExpandSignal = { open: true, version: 0 };

const TreeContext = createContext<TreeContextValue>({
  columns: ['older', 'newer'],
  expand: NEVER_EXPANDED,
});

/**
 * Who made the change. An approximate editor explains itself in a tooltip; inside a group's toggle (`inToggle`),
 * which is itself a button, the explanation is screen reader text and a `title` instead of a focusable tooltip.
 */
const Editor = ({ node, inToggle }: { node: DiffNodeData; inToggle: boolean; }) => {
  const intl = useIntl();
  const user = userName(intl, node.editor);
  if (!node.editorApproximate) {
    return <span className="small text-gray-700 text-nowrap">{intl.formatMessage(messages.editedBy, { user })}</span>;
  }
  const explanation = intl.formatMessage(messages.editedByApproximate, { user });
  if (inToggle) {
    return (
      <span className="small text-gray-700 text-nowrap" title={explanation}>
        <span aria-hidden>{intl.formatMessage(messages.editedByApproximateShort, { user })}</span>
        <span className="sr-only">{explanation}</span>
      </span>
    );
  }
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`publish-history-editor-${node.usageKey}`}>{explanation}</Tooltip>}
    >
      <span className="small text-gray-700 text-nowrap" tabIndex={0} aria-label={explanation}>
        {intl.formatMessage(messages.editedByApproximateShort, { user })}
      </span>
    </OverlayTrigger>
  );
};

/** One line per block: type icon, name, change badge, editor and, for components, a Preview button at the end. */
const NodeHeader = ({ node }: { node: DiffNodeData; }) => {
  const intl = useIntl();
  const { onPreview } = useContext(TreeContext);
  const badge = node.change ? CHANGE_BADGES[node.change] : null;
  const name = node.displayName || node.usageKey;
  const isContainer = CONTAINER_TYPES.has(node.blockType);
  const canPreview = !!onPreview && !!node.change && !isContainer;
  return (
    <div className="d-flex align-items-center w-100 publish-history-node-header">
      <Icon src={getItemIcon(node.blockType)} size="sm" className="mr-2 flex-shrink-0 text-gray-700" />
      <span className="font-weight-bold text-truncate mr-2" title={name}>{name}</span>
      {badge && (
        <Badge variant={badge.variant} className="mr-2 flex-shrink-0">{intl.formatMessage(badge.message)}</Badge>
      )}
      {badge && <Editor node={node} inToggle={isContainer} />}
      {canPreview && (
        <Button
          variant="outline-primary"
          size="sm"
          className="ml-auto flex-shrink-0"
          onClick={() => onPreview?.(node)}
          aria-label={intl.formatMessage(messages.previewLabel, { name })}
        >
          {intl.formatMessage(messages.preview)}
        </Button>
      )}
    </div>
  );
};

/** Where a moved block was (older column) and is (newer column). */
const MoveInfo = ({ node }: { node: DiffNodeData; }) => {
  const intl = useIntl();
  const { columns } = useContext(TreeContext);
  const { move } = node;
  if (!move) {
    return null;
  }
  const sameParent = move.fromParent === move.toParent && move.fromIndex !== null && move.toIndex !== null;
  const text = (side: Age) => {
    if (sameParent) {
      const index = (side === 'older' ? move.fromIndex : move.toIndex) as number;
      return intl.formatMessage(messages.movePosition, { position: index + 1 });
    }
    return intl.formatMessage(side === 'older' ? messages.moveParentOld : messages.moveParentNew);
  };
  return (
    <Row className="small text-gray-700 pt-2">
      {columns.map((side) => <Col xs={6} key={side}>{text(side)}</Col>)}
    </Row>
  );
};

const DiffNode = ({ node }: { node: DiffNodeData; }) => {
  const intl = useIntl();
  const { columns, expand } = useContext(TreeContext);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (expand.version) {
      setOpen(expand.open);
    }
  }, [expand]);

  if (CONTAINER_TYPES.has(node.blockType)) {
    return (
      <li className="mb-3" data-testid={`diff-node-${node.usageKey}`}>
        <Collapsible
          styling="basic"
          title={<NodeHeader node={node} />}
          open={open}
          onToggle={setOpen}
          className="publish-history-group"
        >
          {node.fields.map((field) => (
            <FieldChange key={`${field.scope}-${field.name}`} field={field} columns={columns} />
          ))}
          <MoveInfo node={node} />
          {node.children.length > 0 && <DiffTree nodes={node.children} />}
        </Collapsible>
      </li>
    );
  }
  return (
    <li className="publish-history-block mb-3 p-3" data-testid={`diff-node-${node.usageKey}`}>
      <NodeHeader node={node} />
      {RANDOM_TYPES.has(node.blockType) && (
        <p className="small text-gray-700 mt-2 mb-0">{intl.formatMessage(messages.randomSelection)}</p>
      )}
      <MoveInfo node={node} />
      {node.fields.map((field) => <FieldChange key={`${field.scope}-${field.name}`} field={field} columns={columns} />)}
      {node.children.length > 0 && <DiffTree nodes={node.children} />}
    </li>
  );
};

interface DiffTreeProps {
  nodes: DiffNodeData[];
  label?: string;
}

/**
 * The changed blocks as a tree: sections, subsections and units are collapsible groups (open by default), other
 * blocks are cards with their changed fields in two columns. A block that only holds changes has no badge.
 */
const DiffTree = ({ nodes, label }: DiffTreeProps) => (
  <ul className="publish-history-diff" aria-label={label}>
    {nodes.map((node) => <DiffNode key={node.usageKey} node={node} />)}
  </ul>
);

interface DiffTreeRootProps extends DiffTreeProps {
  /** The left and the right column. */
  columns: [Age, Age];
  expand?: ExpandSignal;
  /** Shows a Preview button on changed components. */
  onPreview?: (node: DiffNodeData) => void;
}

/** The top of the tree: sets the column order, the expand signal and the preview handler for every level. */
export const DiffTreeRoot = ({
  nodes,
  label,
  columns,
  expand = NEVER_EXPANDED,
  onPreview,
}: DiffTreeRootProps) => {
  const value = useMemo(() => ({ columns, expand, onPreview }), [columns, expand, onPreview]);
  return (
    <TreeContext.Provider value={value}>
      <DiffTree nodes={nodes} label={label} />
    </TreeContext.Provider>
  );
};

export default DiffTree;
