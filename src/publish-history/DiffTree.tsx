import {
  createContext,
  memo,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
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

/**
 * The background of a level, alternating like the course outline's cards: the page (and the course) beige, sections
 * white, subsections beige, units white, components beige.
 */
type Tone = 'white' | 'beige';

/** The tone of a node's card, from the tone of the list it sits in. */
const toneOf = (node: DiffNodeData, parent: Tone): Tone => {
  if (node.blockType === 'course') {
    return 'beige';
  }
  return parent === 'white' ? 'beige' : 'white';
};

/** Expand All / Collapse All: each press bumps `version`, and every group then takes `open`. */
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
 * Who made the change: "Added By", "Changed By"... then the user, bold. An approximate editor gets a bold "≈" and
 * explains itself in a tooltip; inside a group's toggle (`inToggle`), which is itself a button, the explanation is
 * screen reader text and a `title` instead of a focusable tooltip.
 */
const Editor = ({ node, inToggle }: { node: DiffNodeData; inToggle: boolean; }) => {
  const intl = useIntl();
  const user = userName(intl, node.editor);
  const values = { change: node.change ?? 'CHANGED', user: <strong key="user">{user}</strong> };
  if (!node.editorApproximate) {
    return (
      <span className="small text-gray-700 publish-history-editor">
        {intl.formatMessage(messages.editedBy, values)}
      </span>
    );
  }
  const explanation = intl.formatMessage(messages.editedByApproximate, { user });
  const short = intl.formatMessage(messages.editedByApproximateShort, {
    ...values,
    b: (...chunks: ReactNode[]) => <strong key="approximate">{chunks}</strong>,
  });
  if (inToggle) {
    return (
      <span className="small text-gray-700 publish-history-editor" title={explanation}>
        <span aria-hidden>{short}</span>
        <span className="sr-only">{explanation}</span>
      </span>
    );
  }
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`publish-history-editor-${node.usageKey}`}>{explanation}</Tooltip>}
    >
      <span className="small text-gray-700 publish-history-editor" tabIndex={0} aria-label={explanation}>
        {short}
      </span>
    </OverlayTrigger>
  );
};

/** Icon, name and change badge: the title of a section, subsection or unit, and of a component's card. */
const BlockTitle = ({ node, nameId }: { node: DiffNodeData; nameId?: string; }) => {
  const intl = useIntl();
  const badge = node.change ? CHANGE_BADGES[node.change] : null;
  const name = node.displayName || node.usageKey;
  return (
    <span className="d-flex align-items-center publish-history-node-header">
      <Icon src={getItemIcon(node.blockType)} size="sm" className="mr-2 flex-shrink-0 text-gray-700" />
      <span id={nameId} className="font-weight-bold text-truncate mr-2" title={name}>{name}</span>
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

/** The block's two cards, labelled with its name and side, each topped by which side it is ("Selected · Newer"). */
const NodePair = ({ node }: { node: DiffNodeData; }) => {
  const intl = useIntl();
  const { columns } = useContext(TreeContext);
  const name = node.displayName || node.usageKey;
  const label = (side: Age) =>
    intl.formatMessage(messages.blockCardLabel, {
      name,
      age: intl.formatMessage(side === 'older' ? messages.ageOlderText : messages.ageNewerText),
    });
  const sideLabel = (side: Age) => (
    <span className="small text-gray-700">
      {intl.formatMessage(messages.sideLabel, {
        side: intl.formatMessage(side === columns[0] ? messages.sideSelected : messages.cardTarget),
        age: intl.formatMessage(side === 'older' ? messages.ageOlder : messages.ageNewer),
      })}
    </span>
  );
  return (
    <BlockPair
      columns={columns}
      slots={nodeSlots(node)}
      header={sideLabel}
      absent={absentSide(node)}
      label={label}
    />
  );
};

const HEADINGS = ['h3', 'h4', 'h5', 'h6'] as const;

interface NodeProps {
  node: DiffNodeData;
  depth: number;
  /** The background of the card this node sits in. */
  parentTone: Tone;
}

/**
 * A section, subsection or unit: a card inset in its parent's, in the other tone, with a heading that opens and closes
 * it, then its own changes (when it moved or its settings changed) as two cards, then its changed blocks.
 */
const ContainerNode = ({ node, depth, parentTone }: NodeProps) => {
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
  const tone = toneOf(node, parentTone);
  return (
    <li className={`publish-history-level publish-history-level-${tone}`} data-testid={`diff-node-${node.usageKey}`}>
      <Collapsible.Advanced open={open} onToggle={setOpen} className="publish-history-group">
        <Heading className="h5 mb-0">
          <Collapsible.Trigger
            tag="span"
            className="publish-history-group-trigger d-flex align-items-center py-1"
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
            <div className="mt-2">
              <NodePair node={node} />
            </div>
          )}
          {node.children.length > 0 && <DiffTree nodes={node.children} depth={depth + 1} tone={tone} />}
        </Collapsible.Body>
      </Collapsible.Advanced>
    </li>
  );
};

/**
 * A component: a card inset in its unit's, in the other tone. One header bar, a group named by the block, holds its
 * icon, name, change badge, who changed it and the Preview button; a random-selection note follows, then its two
 * cards side by side.
 */
const BlockNode = ({ node, depth, parentTone }: NodeProps) => {
  const intl = useIntl();
  const nameId = useId();
  const { onPreview } = useContext(TreeContext);
  const name = node.displayName || node.usageKey;
  const canPreview = !!onPreview && !!node.change;
  const random = RANDOM_TYPES.has(node.blockType);
  const tone = toneOf(node, parentTone);
  return (
    <li className={`publish-history-level publish-history-level-${tone}`} data-testid={`diff-node-${node.usageKey}`}>
      <div
        role="group"
        aria-labelledby={nameId}
        className="publish-history-block-header d-flex flex-wrap align-items-center"
      >
        <BlockTitle node={node} nameId={nameId} />
        {node.change && <Editor node={node} inToggle={false} />}
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
      {random && <p className="small text-gray-700 mt-1 mb-0">{intl.formatMessage(messages.randomSelection)}</p>}
      <div className="mt-2">
        <NodePair node={node} />
      </div>
      {node.children.length > 0 && <DiffTree nodes={node.children} depth={depth + 1} tone={tone} />}
    </li>
  );
};

const DiffNode = (props: NodeProps) => (
  CONTAINER_TYPES.has(props.node.blockType) ? <ContainerNode {...props} /> : <BlockNode {...props} />
);

interface DiffTreeProps {
  nodes: DiffNodeData[];
  label?: string;
  /** How deep these nodes are: sets the level of the group headings, from h3 at the top. */
  depth?: number;
  /** The background the list sits on: the page's (beige) at the top. */
  tone?: Tone;
}

/**
 * The changed blocks as nested cards, like the course outline: sections, subsections and units are collapsible cards
 * (open by default), each inset in its parent's and in the other tone; every other block is a card with a header bar
 * and its two cards, the left column's version and the right column's, with its changed fields lined up across them.
 * A block that only holds changes has no badge.
 */
const DiffTree = ({
  nodes,
  label,
  depth = 0,
  tone = 'beige',
}: DiffTreeProps) => (
  <ul className="publish-history-diff" aria-label={label}>
    {nodes.map((node) => <DiffNode key={node.usageKey} node={node} depth={depth} parentTone={tone} />)}
  </ul>
);

interface DiffTreeRootProps extends DiffTreeProps {
  /** The left and the right column. */
  columns: [Age, Age];
  expand?: ExpandSignal;
  /** Shows a Preview button on changed components. */
  onPreview?: (node: DiffNodeData) => void;
}

/**
 * The top of the tree: sets the column order, the expand signal and the preview handler for every level. Memoized, so
 * the page's own updates (the dropdown, the sticky bar, the preview) don't re-render a large tree.
 */
const DiffTreeRootBase = ({
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

export const DiffTreeRoot = memo(DiffTreeRootBase);

export default DiffTree;
