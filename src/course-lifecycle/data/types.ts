export type LifecycleState = 'draft' | 'changes_requested' | 'for_review' | 'approved' | 'published';

export type CommentType = 'requested_change' | 'reply';

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
  commentType: CommentType;
  parent: number | null;
  replies: BlockReviewComment[];
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  created: string;
  modified: string;
}
