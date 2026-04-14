import {
  Badge, Button, Form, Spinner,
} from '@openedx/paragon';
import { useDispatch } from 'react-redux';

import { fetchCourseOutlineIndexQuery } from '@src/course-outline/data/thunk';
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
import { useRefreshOnPublish, useRequestChangesForm } from '../hooks';

// Surface non-published states in the block count breakdown.
const BREAKDOWN_STATES: LifecycleState[] = [
  'draft', 'changes_requested', 'for_review', 'approved',
];

const STATE_LABELS: Record<LifecycleState, string> = {
  draft: 'Draft',
  changes_requested: 'Changes Requested',
  for_review: 'For Review',
  approved: 'Approved',
  published: 'Published',
};

interface Props {
  courseId: string;
}

export const CourseLifecycleSection = ({ courseId }: Props) => {
  const dispatch = useDispatch();

  const { data, isLoading, error } = useCourseAggregateState(courseId);
  const submitMutation = useSubmitCourseForReview(courseId);
  const approveMutation = useApproveCourse(courseId);
  const requestChangesMutation = useRequestCourseChanges(courseId);
  const publishMutation = usePublishCourse(courseId);

  useRefreshOnPublish(data?.aggregateState, () => dispatch(fetchCourseOutlineIndexQuery(courseId)));

  const {
    showRequestForm, requestComment, setRequestComment, open, cancel, submit,
  } = useRequestChangesForm(requestChangesMutation);

  return (
    <div className="lifecycle-section">
      {isLoading && <Spinner animation="border" size="sm" className="my-1" />}
      {!isLoading && (error || !data) && (
        <p className="x-small text-muted mb-0">This course is not enrolled in the review workflow.</p>
      )}
      {!isLoading && data && (
        <>
          <p className="x-small text-uppercase text-muted font-weight-bold mb-1 mt-2">Current Status</p>
          {data.aggregateState ? (
            <LifecycleBadge state={data.aggregateState} />
          ) : (
            <p className="x-small text-muted mb-0">Not tracked</p>
          )}

          {BREAKDOWN_STATES.some((s) => !!data.blockCounts[s]) && (
            <>
              <p className="x-small text-uppercase text-muted font-weight-bold mb-1 mt-3">Block Breakdown</p>
              <div className="d-flex flex-wrap gap-1">
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
            </>
          )}

          {(data.canSubmit || data.canApprove || data.canRequestChanges || data.canPublish) && (
            <>
              <p className="x-small text-uppercase text-muted font-weight-bold mb-1 mt-3">Actions</p>
              <div className="d-flex flex-column gap-1">
                {data.canSubmit && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="w-100"
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
                    className="w-100"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate()}
                  >
                    {approveMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Approve All'}
                  </Button>
                )}
                {data.canRequestChanges && !showRequestForm && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="w-100"
                    onClick={open}
                  >
                    Request Changes
                  </Button>
                )}
                {data.canRequestChanges && showRequestForm && (
                  <div>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Describe the changes needed..."
                      value={requestComment}
                      onChange={(e) => setRequestComment(e.target.value)}
                      className="mb-2"
                    />
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={cancel}>
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={!requestComment.trim() || requestChangesMutation.isPending}
                        onClick={submit}
                      >
                        {requestChangesMutation.isPending
                          ? <Spinner animation="border" size="sm" />
                          : 'Submit Changes'}
                      </Button>
                    </div>
                  </div>
                )}
                {data.canPublish && (
                  <Button
                    variant="success"
                    size="sm"
                    className="w-100"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate()}
                  >
                    {publishMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Publish Course'}
                  </Button>
                )}
              </div>
            </>
          )}
          <CourseCommentsPanel courseId={courseId} />
        </>
      )}
    </div>
  );
};
