import React from 'react';
import {
  Alert,
  Badge,
  Button,
  Icon,
  Sheet,
  Spinner,
} from '@openedx/paragon';
import {
  Close,
  StarFilled,
} from '@openedx/paragon/icons';
import UserIdentity from '../../../components/UserIdentity';
import { useFeedbackDashboardComments } from '../../data/apiHooks';
import type {
  FeedbackDashboardComment,
  FeedbackDashboardSubject,
} from './types';

interface FeedbackDashboardCommentsSheetProps {
  programId: string;
  initiationId: number | null;
  subject: FeedbackDashboardSubject | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatCommentDate = (dateValue?: string) => {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const CommentRating: React.FC<{ rating?: number | null }> = ({ rating }) => {
  if (rating === undefined || rating === null) {
    return null;
  }

  return (
    <Badge variant="light" className="feedback-dashboard-comment-rating">
      <Icon src={StarFilled} className="feedback-dashboard-comment-rating-icon" />
      {rating.toFixed(1)}
    </Badge>
  );
};

const FeedbackDashboardCommentItem: React.FC<{ comment: FeedbackDashboardComment }> = ({ comment }) => (
  <article className="feedback-dashboard-comment-item">
    <div className="feedback-dashboard-comment-item-header">
      <UserIdentity
        name={comment.reviewer.name}
        badges={comment.reviewer.roles ?? []}
        avatarValue={comment.reviewer.avatar ?? ''}
        size="compact"
      />
      <CommentRating rating={comment.rating} />
    </div>
    {comment.criterionLabel && (
      <p className="feedback-dashboard-comment-criterion">{comment.criterionLabel}</p>
    )}
    <p className="feedback-dashboard-comment-text">{comment.comment}</p>
    {comment.createdAt && (
      <p className="feedback-dashboard-comment-date">{formatCommentDate(comment.createdAt)}</p>
    )}
  </article>
);

const FeedbackDashboardCommentsSheet: React.FC<FeedbackDashboardCommentsSheetProps> = ({
  programId,
  initiationId,
  subject,
  isOpen,
  onClose,
}) => {
  const {
    data,
    isLoading,
    isError,
  } = useFeedbackDashboardComments(programId, initiationId, subject?.id ?? null, isOpen);

  const comments = data?.comments ?? [];
  const total = data?.total ?? subject?.commentsSummary?.total ?? 0;

  return (
    <Sheet
      show={isOpen}
      position="right"
      blocking={false}
      onClose={onClose}
      className="feedback-dashboard-comments-sheet"
      containerClassName="feedback-dashboard-comments-sheet-container"
    >
      <div className="feedback-dashboard-comments-sheet-header">
        <div>
          <p className="feedback-dashboard-comments-sheet-kicker">Feedback comments</p>
          <h3>{subject?.name ?? 'Comments'}</h3>
          <p>{total} {total === 1 ? 'comment' : 'comments'}</p>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          onClick={onClose}
          className="feedback-dashboard-comments-sheet-close"
        >
          <Icon src={Close} screenReaderText="Close comments" />
        </Button>
      </div>

      {subject && (
        <div className="feedback-dashboard-comments-subject">
          <UserIdentity
            name={subject.name}
            badges={[subject.role ?? 'Instructor']}
            avatarValue={subject.avatar ?? ''}
            size="default"
          />
        </div>
      )}

      <div className="feedback-dashboard-comments-sheet-body">
        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText="Loading feedback comments..." />
          </div>
        )}

        {!isLoading && isError && (
          <Alert variant="danger">
            Failed to load feedback comments.
          </Alert>
        )}

        {!isLoading && !isError && comments.length === 0 && (
          <p className="feedback-dashboard-comments-empty">
            No comments are available for this person.
          </p>
        )}

        {!isLoading && !isError && comments.map((comment) => (
          <FeedbackDashboardCommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </Sheet>
  );
};

export default FeedbackDashboardCommentsSheet;
