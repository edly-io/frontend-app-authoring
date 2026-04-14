import type { BlockReviewComment, BlockReviewState, CourseAggregateState } from './types';

export const mockBlockReviewState = (overrides: Partial<BlockReviewState> = {}): BlockReviewState => ({
  usageKey: 'block-v1:TestOrg+TestCourse+2025_T1+type@vertical+block@unit1',
  courseId: 'course-v1:TestOrg+TestCourse+2025_T1',
  state: 'draft',
  isPublishable: false,
  submittedBy: null,
  submittedAt: null,
  approvedBy: null,
  approvedAt: null,
  publishedAt: null,
  canSubmit: true,
  canApprove: false,
  canRequestChanges: false,
  canPublish: false,
  ...overrides,
});

export const mockCourseAggregateState = (overrides: Partial<CourseAggregateState> = {}): CourseAggregateState => ({
  courseId: 'course-v1:TestOrg+TestCourse+2025_T1',
  aggregateState: 'draft',
  blockCounts: {
    draft: 3,
    changes_requested: 0,
    for_review: 1,
    approved: 1,
    published: 0,
  },
  isFullyPublishable: false,
  canSubmit: true,
  canApprove: false,
  canRequestChanges: false,
  canPublish: false,
  ...overrides,
});

export const mockBlockReviewComment = (overrides: Partial<BlockReviewComment> = {}): BlockReviewComment => ({
  id: 1,
  usageKey: 'block-v1:TestOrg+TestCourse+2025_T1+type@vertical+block@unit1',
  courseId: 'course-v1:TestOrg+TestCourse+2025_T1',
  author: 'abc123',
  comment: 'Needs revision',
  commentType: 'requested_change',
  parent: null,
  replies: [],
  resolved: false,
  resolvedBy: null,
  resolvedAt: null,
  created: '2025-04-09T12:00:00.000Z',
  modified: '2025-04-09T12:00:00.000Z',
  ...overrides,
});
