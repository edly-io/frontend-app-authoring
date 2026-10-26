/** What the current user may do with publish history (`status/`). */
export interface PublishHistoryStatus {
  /** The `uber_publish_history.enabled` flag is on for the user. */
  enabled: boolean;
  /** The user may see this course's publish history (Studio write access). */
  canView: boolean;
}

export interface HistoryUser {
  id: number;
  username: string;
}

/** One published version of the course. */
export interface PublishVersion {
  id: string;
  publishedAt: string | null;
  publishedBy: HistoryUser | null;
  /** The next older version, or null at the end of the history. */
  previousId: string | null;
  isCurrent: boolean;
}

/** Why the history stops: removed by the platform (`pruned`) or the version created with the course. */
export type HistoryEnds = 'pruned' | 'course_created' | null;

export interface VersionsPage {
  /** The `after` cursor of the next page, or null on the last. */
  nextAfter: string | null;
  results: PublishVersion[];
  historyEnds: HistoryEnds;
}

export type SideKind = 'version' | 'published' | 'draft';

export interface DiffSide {
  id: string;
  kind: SideKind;
  at: string | null;
  by: HistoryUser | null;
}

export type TextOp = 'equal' | 'insert' | 'delete';

export interface TextSegment {
  op: TextOp;
  text: string;
}

export interface TextDiffData {
  kind: 'words' | 'lines';
  segments: TextSegment[];
}

/** A key (string) or list index (number) in a JSON value. */
export type JsonPathPart = string | number;

export interface JsonChange {
  /** Where the value is in the newer value; for `removed`, where it was in the older one. */
  path: JsonPathPart[];
  /** Where a `changed` value was in the older value, when its list item moved; otherwise null. */
  oldPath: JsonPathPart[] | null;
  op: 'added' | 'removed' | 'changed';
  old: unknown;
  new: unknown;
  /** A value was cut: it is then the start of its JSON text. */
  tooLarge: boolean;
}

export interface JsonUnchanged {
  /** The container whose direct keys or items are counted. */
  path: JsonPathPart[];
  count: number;
}

/** A key-level diff of a dict or list value. */
export interface JsonDiffData {
  changes: JsonChange[];
  unchanged: JsonUnchanged[];
  /** More keys changed than are listed. */
  truncated: boolean;
}

/** Why a field was not diffed: over a size cap, or past the comparison's diff budget. */
export type TooLargeReason = 'size' | 'budget' | null;

export interface FieldChangeData {
  name: string;
  scope: 'settings' | 'content';
  /** Null when `textDiff` or `jsonDiff` holds the change. Cut short when `tooLarge`. */
  old: unknown;
  new: unknown;
  textDiff: TextDiffData | null;
  jsonDiff: JsonDiffData | null;
  /** The field was not diffed, or a value was cut. */
  tooLarge: boolean;
  tooLargeReason: TooLargeReason;
}

export type ChangeKind = 'ADDED' | 'REMOVED' | 'CHANGED' | 'MOVED';

export interface MoveData {
  fromParent: string | null;
  toParent: string | null;
  fromIndex: number | null;
  toIndex: number | null;
}

export interface DiffNodeData {
  usageKey: string;
  blockType: string;
  displayName: string | null;
  /** Null for a block that only holds changed blocks. */
  change: ChangeKind | null;
  editor: HistoryUser | null;
  /** The editor is the parent's: the block was removed or moved, not edited. */
  editorApproximate: boolean;
  move: MoveData | null;
  fields: FieldChangeData[];
  children: DiffNodeData[];
}

export interface DiffResult {
  /** The older side. */
  from: DiffSide;
  to: DiffSide;
  identical: boolean;
  totalChanges: number;
  /** More blocks changed than the tree lists. */
  truncated: boolean;
  /** Some fields were not diffed because the comparison's diff budget ran out. */
  budgetExhausted: boolean;
  tree: DiffNodeData[];
}

/** A column of the comparison: the older or the newer side. */
export type Age = 'older' | 'newer';

/** What `against` can be in the compare page's URL; `previous` is the version before this one. */
export type AgainstChoice = string;
export const PREVIOUS = 'previous';
export const PUBLISHED = 'published';
export const DRAFT = 'draft';
