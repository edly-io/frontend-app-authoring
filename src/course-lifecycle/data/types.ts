export type LifecycleState = 'draft' | 'for_review' | 'approved' | 'published';

export interface BlockReviewState {
  usageKey: string;
  courseId: string;
  state: LifecycleState;
  isPublishable: boolean;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  canSubmit: boolean;
  canApprove: boolean;
  canRequestChanges: boolean;
  canPublish: boolean;
}

export interface CourseAggregateState {
  courseId: string;
  aggregateState: LifecycleState | null;
  blockCounts: Partial<Record<LifecycleState, number>>;
  isFullyPublishable: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canRequestChanges: boolean;
  canPublish: boolean;
}

export interface BlockReviewComment {
  id: number;
  usageKey: string;
  courseId: string;
  author: string;
  comment: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  created: string;
  modified: string;
}
