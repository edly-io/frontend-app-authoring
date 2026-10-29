export type SlotKey = 'complete' | 'retained';

export type BadgeKind = 'curriculum' | 'course';

/** Which Studio page a ManagementPageLayout renders. */
export type ManagementSection = 'curriculums' | 'badges';

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
  title: string;
  description: string;
  imageUrl: string | null;
  courses: CurriculumCourse[];
  knowledgeCheck: CourseRef;
  knowledgeCheckDelayDays: number;
  knowledgeCheckPassThreshold?: number | null;
  knowledgeCheckMaxAttempts?: number | null;
  knowledgeCheckTimeLimit?: number | null;
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
  title: string;
  description: string;
  image: File | null;
  removeImage: boolean;
  courseIds: string[];
  knowledgeCheckCourseId: string;
  knowledgeCheckDelayDays: number;
  knowledgeCheckPassThreshold: number;
  knowledgeCheckMaxAttempts: number;
  knowledgeCheckTimeLimit: number | null;
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
}
