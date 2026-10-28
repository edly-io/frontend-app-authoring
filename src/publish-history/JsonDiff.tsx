import { useIntl } from '@edx/frontend-platform/i18n';

import type { Slot } from './BlockPair';
import type {
  Age,
  JsonChange,
  JsonDiffData,
  JsonPathPart,
} from './types';
import messages from './messages';
import { formatPath, formatValue } from './utils';

type JsonRow =
  | { kind: 'context'; path: JsonPathPart[]; }
  | { kind: 'unchanged'; path: JsonPathPart[]; count: number; }
  | { kind: 'change'; path: JsonPathPart[]; change: JsonChange; };

// At the same path, a container's own line comes first, then its unchanged count, then the changes.
const KIND_ORDER = { context: 0, unchanged: 1, change: 2 };

const comparePaths = (a: JsonPathPart[], b: JsonPathPart[]) => {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const [left, right] = [a[index], b[index]];
    if (left !== right) {
      if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
      }
      return String(left).localeCompare(String(right));
    }
  }
  return a.length - b.length;
};

/**
 * One ordered list of rows for both cards, so they line up: each change, the parent keys of changed paths (as
 * context) and the unchanged counts. Rows at the same path keep the API's order (removed before added).
 */
const buildRows = (diff: JsonDiffData): JsonRow[] => {
  const rows: JsonRow[] = diff.changes.map((change) => ({ kind: 'change', path: change.path, change }));
  const seen = new Set(rows.map((row) => JSON.stringify(row.path)));
  diff.changes.forEach((change) => {
    for (let depth = 1; depth < change.path.length; depth += 1) {
      const path = change.path.slice(0, depth);
      const key = JSON.stringify(path);
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({ kind: 'context', path });
      }
    }
  });
  diff.unchanged.forEach(({ path, count }) => rows.push({ kind: 'unchanged', path, count }));
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (
      comparePaths(a.row.path, b.row.path) || KIND_ORDER[a.row.kind] - KIND_ORDER[b.row.kind] || a.index - b.index
    ))
    .map(({ row }) => row);
};

interface CellProps {
  change: JsonChange;
  side: Age;
}

/** One side of a change: the old value struck through in red, the new one underlined in green, or an empty cell. */
const Cell = ({ change, side }: CellProps) => {
  const intl = useIntl();
  const present = side === 'older' ? change.op !== 'added' : change.op !== 'removed';
  if (!present) {
    return (
      <div className="publish-history-json-cell text-gray-500">
        <span aria-hidden>–</span>
        <span className="sr-only">{intl.formatMessage(messages.jsonAbsent)}</span>
      </div>
    );
  }
  const text = formatValue(side === 'older' ? change.old : change.new, intl.formatMessage(messages.fieldEmpty));
  const Mark = side === 'older' ? 'del' : 'ins';
  return (
    <div className="publish-history-json-cell">
      <Mark>
        <span className="sr-only">{intl.formatMessage(side === 'older' ? messages.deleted : messages.inserted)}</span>
        {text}
      </Mark>
      {change.tooLarge && <div className="small text-gray-700">{intl.formatMessage(messages.jsonValueCut)}</div>}
      {side === 'older' && change.oldPath && (
        <div className="small text-gray-700">
          {intl.formatMessage(messages.jsonMovedFrom, { path: formatPath(change.oldPath) })}
        </div>
      )}
    </div>
  );
};

interface RowProps {
  row: JsonRow;
  name: string;
  side: Age;
}

/** One row of a key-level diff on one side: a muted parent key, an unchanged count, or a change with its key path. */
const JsonRowView = ({ row, name, side }: RowProps) => {
  const intl = useIntl();
  const label = row.path.length ? formatPath(row.path) : name;
  if (row.kind === 'context') {
    return <div className="publish-history-json-path text-gray-700">{label}</div>;
  }
  if (row.kind === 'unchanged') {
    return (
      <div className="small text-gray-700 font-italic">
        {intl.formatMessage(messages.jsonUnchanged, { count: row.count })}
      </div>
    );
  }
  return (
    <div className="publish-history-json-row">
      <div className="publish-history-json-path mb-1">{label}</div>
      <Cell change={row.change} side={side} />
    </div>
  );
};

const Truncated = () => {
  const intl = useIntl();
  return <p className="small text-gray-700 mb-0">{intl.formatMessage(messages.jsonTruncated)}</p>;
};

const rowKey = (row: JsonRow) => (
  `${row.kind === 'change' ? row.change.op : row.kind}-${JSON.stringify(row.path)}`
);

/**
 * A key-level diff of a dict or list value as slots, one per row, so each key lines up across the two cards. Values
 * are authored data and are rendered as text only.
 */
export const jsonDiffSlots = (name: string, diff: JsonDiffData, keyPrefix: string): Slot[] => {
  const slots: Slot[] = buildRows(diff).map((row) => ({
    key: `${keyPrefix}-${rowKey(row)}`,
    className: `publish-history-json ${row.kind === 'change' ? 'py-2' : 'py-1'}`,
    render: (side: Age) => <JsonRowView row={row} name={name} side={side} />,
  }));
  if (diff.truncated) {
    slots.push({ key: `${keyPrefix}-truncated`, className: 'py-1', render: () => <Truncated /> });
  }
  return slots;
};
