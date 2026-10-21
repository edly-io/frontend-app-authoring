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

export interface FieldChangeData {
  name: string;
  scope: 'settings' | 'content';
  /** Null when `textDiff` holds the change, or the text was too large to diff. */
  old: unknown;
  new: unknown;
  textDiff: TextDiffData | null;
  /** The text was not diffed, or the values were cut. */
  tooLarge: boolean;
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
  tree: DiffNodeData[];
}

/** What `against` can be in the compare page's URL; `previous` is the version before this one. */
export type AgainstChoice = string;
export const PREVIOUS = 'previous';
export const PUBLISHED = 'published';
export const DRAFT = 'draft';
