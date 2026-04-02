import { Badge, Button, Spinner } from '@openedx/paragon';

import {
  useCourseAggregateState,
  useSubmitCourseForReview,
  useApproveCourse,
  useRequestCourseChanges,
  usePublishCourse,
} from '../data/apiHooks';
import type { LifecycleState } from '../data/types';
import { LifecycleBadge } from './LifecycleBadge';
import { CourseCommentsPanel } from './CourseCommentsPanel';

// Only surface non-published states in the block count breakdown.
// Published is the expected clean state and doesn't need to be called out.
const BREAKDOWN_STATES: LifecycleState[] = ['draft', 'for_review', 'approved'];

const STATE_LABELS: Record<LifecycleState, string> = {
  draft: 'Draft',
  for_review: 'For Review',
  approved: 'Approved',
  published: 'Published',
};

interface Props {
  courseId: string;
}

export const CourseLifecycleSection = ({ courseId }: Props) => {
  const { data, isLoading, error } = useCourseAggregateState(courseId);
  const submitMutation = useSubmitCourseForReview(courseId);
  const approveMutation = useApproveCourse(courseId);
  const requestChangesMutation = useRequestCourseChanges(courseId);
  const publishMutation = usePublishCourse(courseId);

  return (
    <div className="lifecycle-section">
      {isLoading && <Spinner animation="border" size="sm" className="my-1" />}
      {!isLoading && (error || !data) && (
        <p className="x-small text-muted mb-0">Not tracked</p>
      )}
      {!isLoading && data && (
        <>
          {data.aggregateState ? (
            <LifecycleBadge state={data.aggregateState} />
          ) : (
            <p className="x-small text-muted mb-0">Not tracked</p>
          )}
          <div className="d-flex flex-wrap gap-1 mt-2">
            {BREAKDOWN_STATES.map((state) => {
              const count = data.blockCounts[state];
              if (!count) {
                return null;
              }
              return (
                <Badge key={state} variant="light" className="x-small">
                  {`${count} ${STATE_LABELS[state]}`}
                </Badge>
              );
            })}
          </div>
          {(data.canSubmit || data.canApprove || data.canRequestChanges || data.canPublish) && (
            <div className="d-flex flex-column gap-1 mt-1">
              {data.canSubmit && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="w-100 my-1"
                  disabled={submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Submit All for Review'}
                </Button>
              )}
              {data.canApprove && (
                <Button
                  variant="success"
                  size="sm"
                  className="w-100 my-1"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  {approveMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Approve All'}
                </Button>
              )}
              {data.canRequestChanges && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="w-100 my-1"
                  disabled={requestChangesMutation.isPending}
                  onClick={() => requestChangesMutation.mutate()}
                >
                  {requestChangesMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Request Changes'}
                </Button>
              )}
              {data.canPublish && (
                <Button
                  variant="success"
                  size="sm"
                  className="w-100 my-1"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                >
                  {publishMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Publish Course'}
                </Button>
              )}
            </div>
          )}
          <CourseCommentsPanel courseId={courseId} />
        </>
      )}
    </div>
  );
};
