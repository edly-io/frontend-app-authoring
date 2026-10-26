import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { KeyboardEvent } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge,
  Button,
  Collapsible,
  Icon,
  OverlayTrigger,
  Tooltip,
} from '@openedx/paragon';
import { ExpandLess, ExpandMore } from '@openedx/paragon/icons';

import { getItemIcon } from '@src/generic/block-type-utils';

import BlockPair from './BlockPair';
import type { Slot } from './BlockPair';
import { fieldSlots } from './FieldChange';
import type {
  Age,
  ChangeKind,
  DiffNodeData,
  MoveData,
} from './types';
import messages from './messages';
import { userName } from './utils';

export const CHANGE_BADGES: Record<ChangeKind, { variant: string; message: typeof messages.changeAdded; }> = {
  ADDED: { variant: 'success', message: messages.changeAdded },
  REMOVED: { variant: 'danger', message: messages.changeRemoved },
  CHANGED: { variant: 'warning', message: messages.changeChanged },
  MOVED: { variant: 'info', message: messages.changeMoved },
};

/** Sections, subsections and units: shown as collapsible headings, never previewed. */
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

/** Icon, name and change badge: the title of a section, subsection or unit, and the header of each card. */
const BlockTitle = ({ node }: { node: DiffNodeData; }) => {
  const intl = useIntl();
  const badge = node.change ? CHANGE_BADGES[node.change] : null;
  const name = node.displayName || node.usageKey;
  return (
    <span className="d-flex align-items-center publish-history-node-header">
      <Icon src={getItemIcon(node.blockType)} size="sm" className="mr-2 flex-shrink-0 text-gray-700" />
      <span className="font-weight-bold text-truncate mr-2" title={name}>{name}</span>
      {badge && (
        <Badge variant={badge.variant} className="mr-2 flex-shrink-0">{intl.formatMessage(badge.message)}</Badge>
      )}
    </span>
  );
};

/** Where a moved block was (older side) or is (newer side). */
const MoveText = ({ move, side }: { move: MoveData; side: Age; }) => {
  const intl = useIntl();
  if (move.fromParent === move.toParent && move.fromIndex !== null && move.toIndex !== null) {
    const index = side === 'older' ? move.fromIndex : move.toIndex;
    return <>{intl.formatMessage(messages.movePosition, { position: index + 1 })}</>;
  }
  return <>{intl.formatMessage(side === 'older' ? messages.moveParentOld : messages.moveParentNew)}</>;
};

/** A block's own changes as card slots: where it moved, then each changed field. */
const nodeSlots = (node: DiffNodeData): Slot[] => {
  const { move } = node;
  const moveSlot: Slot[] = move
    ? [{
      key: 'move',
      className: 'pt-3 small text-gray-700',
      render: (side: Age) => <MoveText move={move} side={side} />,
    }]
    : [];
  return [...moveSlot, ...node.fields.flatMap(fieldSlots)];
};

/** The side a block is not in: the older one for an added block, the newer one for a removed block. */
const absentSide = (node: DiffNodeData): Age | null => {
  if (node.change === 'ADDED') {
    return 'older';
  }
  return node.change === 'REMOVED' ? 'newer' : null;
};

/** The block's two cards, labelled with its name and side. */
const NodePair = ({ node, header }: { node: DiffNodeData; header: boolean; }) => {
  const intl = useIntl();
  const { columns } = useContext(TreeContext);
  const name = node.displayName || node.usageKey;
  const label = (side: Age) =>
    intl.formatMessage(messages.blockCardLabel, {
      name,
      age: intl.formatMessage(side === 'older' ? messages.ageOlderText : messages.ageNewerText),
    });
  return (
    <BlockPair
      columns={columns}
      slots={nodeSlots(node)}
      header={header ? () => <BlockTitle node={node} /> : undefined}
      absent={absentSide(node)}
      label={label}
    />
  );
};

const HEADINGS = ['h3', 'h4', 'h5', 'h6'] as const;
const INDENTS = ['', 'pl-3', 'pl-4', 'pl-5'];

/**
 * A section, subsection or unit: a full-width heading that opens and closes the group, then its own changes (when it
 * moved or its settings changed) as two cards, then its changed blocks. Only the heading is indented by depth, so the
 * cards of every level stay in the page's two columns.
 */
const ContainerNode = ({ node, depth }: { node: DiffNodeData; depth: number; }) => {
  const { expand } = useContext(TreeContext);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (expand.version) {
      setOpen(expand.open);
    }
  }, [expand]);
  const Heading = HEADINGS[Math.min(depth, HEADINGS.length - 1)];
  const hasOwnChanges = !!node.move || node.fields.length > 0;
  // Paragon's trigger is a span with role="button" that toggles on Enter only; a button also toggles on Space.
  const toggleOnSpace = (event: KeyboardEvent) => {
    if (event.key === ' ') {
      event.preventDefault();
      setOpen((last) => !last);
    }
  };
  return (
    <li className="mb-3" data-testid={`diff-node-${node.usageKey}`}>
      <Collapsible.Advanced open={open} onToggle={setOpen} className="publish-history-group">
        <Heading className="h5 mb-0">
          <Collapsible.Trigger
            tag="span"
            className={`publish-history-group-trigger d-flex align-items-center py-2 ${INDENTS[Math.min(depth, 3)]}`}
            onKeyDown={toggleOnSpace}
          >
            <span className="mr-2 d-flex flex-shrink-0">
              <Collapsible.Visible whenClosed>
                <Icon src={ExpandMore} />
              </Collapsible.Visible>
              <Collapsible.Visible whenOpen>
                <Icon src={ExpandLess} />
              </Collapsible.Visible>
            </span>
            <BlockTitle node={node} />
            {node.change && <Editor node={node} inToggle />}
          </Collapsible.Trigger>
        </Heading>
        <Collapsible.Body>
          {hasOwnChanges && (
            <div className="mb-3">
              <NodePair node={node} header={false} />
            </div>
          )}
          {node.children.length > 0 && <DiffTree nodes={node.children} depth={depth + 1} />}
        </Collapsible.Body>
      </Collapsible.Advanced>
    </li>
  );
};

/** A component: its two cards side by side, then who changed it, a random-selection note and the Preview button. */
const BlockNode = ({ node, depth }: { node: DiffNodeData; depth: number; }) => {
  const intl = useIntl();
  const { onPreview } = useContext(TreeContext);
  const name = node.displayName || node.usageKey;
  const canPreview = !!onPreview && !!node.change;
  const random = RANDOM_TYPES.has(node.blockType);
  return (
    <li className="mb-4" data-testid={`diff-node-${node.usageKey}`}>
      <NodePair node={node} header />
      {(node.change || random || canPreview) && (
        <div className="d-flex flex-wrap align-items-center mt-2">
          {node.change && <Editor node={node} inToggle={false} />}
          {random && <span className="small text-gray-700 ml-3">{intl.formatMessage(messages.randomSelection)}</span>}
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
      )}
      {node.children.length > 0 && <DiffTree nodes={node.children} depth={depth + 1} />}
    </li>
  );
};

const DiffNode = ({ node, depth }: { node: DiffNodeData; depth: number; }) => (
  CONTAINER_TYPES.has(node.blockType)
    ? <ContainerNode node={node} depth={depth} />
    : <BlockNode node={node} depth={depth} />
);

interface DiffTreeProps {
  nodes: DiffNodeData[];
  label?: string;
  /** How deep these nodes are: sets the level of the group headings, from h3 at the top. */
  depth?: number;
}

/**
 * The changed blocks as a tree: sections, subsections and units are collapsible full-width headings (open by
 * default); every other block is a row of two cards, the left column's version and the right column's, with its
 * changed fields lined up across them. A block that only holds changes has no badge.
 */
const DiffTree = ({ nodes, label, depth = 0 }: DiffTreeProps) => (
  <ul className="publish-history-diff" aria-label={label}>
    {nodes.map((node) => <DiffNode key={node.usageKey} node={node} depth={depth} />)}
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
