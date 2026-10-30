export type SlotKey = 'complete' | 'retained';

export type BadgeKind = 'curriculum' | 'course';

/** Which Studio page a ManagementPageLayout renders. */
export type ManagementSection = 'curriculums' | 'badges' | 'courseGroups' | 'deepLinks';

/** `status/`: the flag evaluated for the current user (spec §6.4). */
export interface ManagementStatus {
  enabled: boolean;
}

export interface CourseRef {
  courseId: string;
  displayName: string | null;
  exists: boolean;
}

export interface CurriculumCourse extends CourseRef {
  position: number;
}

export interface BadgeSummary {
  uuid: string;
  title: string;
  imageUrl: string | null;
}

/** A filled curriculum slot. */
export interface SlotBadge extends BadgeSummary {
  /** A learner earned this badge for this curriculum and slot, so the slot's badge can't change. */
  earned: boolean;
}

export interface Curriculum {
  uuid: string;
  /** The learning path ID Uber signs into links: set on create, never changed. */
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  courses: CurriculumCourse[];
  knowledgeCheck: CourseRef;
  knowledgeCheckDelayDays: number;
  /** Always both keys; null = empty slot (spec §6.4). */
  badges: Record<SlotKey, SlotBadge | null>;
  created: string;
  modified: string;
}

export interface LinkedCurriculum {
  uuid: string;
  title: string;
  slot: SlotKey;
}

export interface Badge {
  uuid: string;
  title: string;
  description: string;
  imageUrl: string | null;
  /** Set on create, never changed (spec R11). */
  kind: BadgeKind;
  /** The courses that award a course badge, in the order added; always empty for a curriculum badge. */
  courses: CourseRef[];
  linkedCurriculums: LinkedCurriculum[];
  /** Distinct learners who earned the badge. Above 0, a course badge's course can't change. */
  awardCount: number;
  created: string;
  modified: string;
}

export interface CourseGroupCourse extends CourseRef {
  position: number;
}

/** A driver group Uber names by its slug in a launch link, with its optional courses. */
export interface CourseGroup {
  /** The group ID: set on create, never changed (Uber's links name it). */
  slug: string;
  title: string;
  description: string;
  courses: CourseGroupCourse[];
  /** Learners whose latest launch put them in the group. */
  learnerCount: number;
  created: string;
  modified: string;
}

export interface CourseGroupWriteData {
  /** Ignored by the server on update. */
  slug: string;
  title: string;
  description: string;
  courseIds: string[];
}

/** Where a launch link leads: the home page, a course page, the home page's optional courses or a learning path. */
export type LaunchTarget = 'home' | 'course' | 'optional' | 'path';

/** The course a link is built for: the key and the name to show. */
export interface PickedCourse {
  id: string;
  displayName: string;
}

/** A learning path a link assigns: its ID and the title to show. */
export interface PickedPath {
  id: string;
  title: string;
}

/** A learning path or course group a saved link names, with its title while it still exists in Studio. */
export interface DeepLinkRef {
  slug: string;
  title: string | null;
  exists: boolean;
}

/** A deep link kept on the Deep links tab: what the Uber app opens, and what it carries. */
export interface DeepLink {
  uuid: string;
  title: string;
  description: string;
  target: LaunchTarget;
  /** The course the link enrolls in (a course link opens it), or null. */
  course: CourseRef | null;
  /** The learning paths the link assigns, in order; a path link opens the first. */
  paths: DeepLinkRef[];
  /** The groups the link puts the driver in; empty keeps the driver's groups. */
  groups: DeepLinkRef[];
  /** `UBER_DRIVER_APP_LINK_BASE` plus the fields above: what the author hands to Uber. */
  appLink: string;
  created: string;
  modified: string;
}

export interface DeepLinkWriteData {
  title: string;
  description: string;
  target: LaunchTarget;
  /** Empty for none. */
  courseId: string;
  /** In order; a path link opens the first. */
  pathIds: string[];
  groups: string[];
}

/** `deep-links/config/`: the link shapes, and whether this Studio can mint signed test links. */
export interface DeepLinksConfig {
  targets: LaunchTarget[];
  scheme: string;
  /** Where the Uber app's own deep link starts (`UBER_DRIVER_APP_LINK_BASE`). */
  appLinkBase: string;
  /** The Uber Learn MFE base URL, or '' when the CMS doesn't know it. */
  learnBaseUrl: string;
  testLinks: {
    enabled: boolean;
    unavailableReason: 'off' | 'other_scheme' | null;
  };
  maxTtlSeconds: number;
  defaultTtlSeconds: number;
}

export interface TestLinkRequest {
  target: LaunchTarget;
  /** The course the link enrolls in; empty for none (a course link needs one). */
  courseId: string;
  /** The learning path IDs the link assigns, comma-separated; empty for none (a path link needs one). */
  pathId: string;
  /** Empty for a new dev-<hex> ID. */
  externalId: string;
  /** null: the link carries no groups (the learner keeps theirs); []: it removes them all. */
  groups: string[] | null;
  ttl?: number;
}

/** A minted test link. `launch` and `url` log the learner in: show them, never log them. */
export interface TestLink {
  url: string | null;
  launch: string;
  externalId: string;
  target: LaunchTarget;
  courseId: string;
  pathId: string;
  groups: string[] | null;
  expiresAt: string;
}

export interface CourseSearchResult {
  courseId: string;
  displayName: string;
  org: string;
  number: string;
  run: string;
  /** The course badge this course already awards (a course awards at most one), or null. */
  badge: { uuid: string; title: string; } | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CurriculumWriteData {
  /** Sent on create only (empty: the server makes one from the title); ignored by a PUT. */
  slug: string;
  title: string;
  description: string;
  image: File | null;
  removeImage: boolean;
  courseIds: string[];
  knowledgeCheckCourseId: string;
  knowledgeCheckDelayDays: number;
  /** Slot -> badge UUID, or null for an empty slot (spec R6). */
  badges: Record<SlotKey, string | null>;
}

export interface BadgeWriteData {
  title: string;
  description: string;
  image: File | null;
  removeImage: boolean;
  /** Sent on create only; the server ignores it afterwards (spec R11). */
  kind?: BadgeKind;
  /** Course badges only: the full list, replacing the old one. Undefined = don't send (keep). */
  courseIds?: string[];
}

/** Which form modal is open. `null`: none; `'new'`: create; any other string: uuid of the item being edited. */
export type FormTarget = null | 'new' | string;

export interface CurriculumManagementOutletContext {
  formTarget: FormTarget;
  /**
   * Asks to open a form, or to close it with `null`; goes through the unsaved-changes prompt
   * when a dirty form is open.
   */
  setFormTarget: (target: FormTarget) => void;
  /** Closes the open form without prompting (after a save). */
  closeForm: () => void;
  setFormDirty: (dirty: boolean) => void;
  /** Puts page-specific reference content at the top of the help sidebar; null clears it (on unmount). */
  setSidebarExtra: (content: React.ReactNode) => void;
}
