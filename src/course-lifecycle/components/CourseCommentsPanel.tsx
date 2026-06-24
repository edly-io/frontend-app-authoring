import { useState } from 'react';
import {
  Badge,
  Button,
  Collapsible,
  Form,
  Spinner,
} from '@openedx/paragon';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BlockReviewComment } from '../data/types';
import { deleteComment, resolveComment } from '../data/api';
import { lifecycleQueryKeys, useAddCourseReply, useCourseComments } from '../data/apiHooks';

interface CourseReplyFormProps {
  commentId: number;
  courseId: string;
  onCancel: () => void;
}

const CourseReplyForm = ({ commentId, courseId, onCancel }: CourseReplyFormProps) => {
  const [text, setText] = useState('');
  const replyMutation = useAddCourseReply(courseId);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) { return; }
    replyMutation.mutate({ commentId, comment: trimmed }, {
      onSuccess: () => {
        setText('');
        onCancel();
      },
    });
  };

  return (
    <div className="mt-2 ms-3">
      <Form.Control
        as="textarea"
        rows={2}
        placeholder="Write a reply..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mb-1"
      />
      <div className="d-flex gap-1">
        <Button variant="outline-secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!text.trim() || replyMutation.isPending}
          onClick={handleSubmit}
        >
          {replyMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Add Reply'}
        </Button>
      </div>
    </div>
  );
};

interface CourseCommentRowProps {
  comment: BlockReviewComment;
  courseId: string;
  resolveMutationPending: boolean;
  deleteMutationPending: boolean;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
  isReply?: boolean;
}

const CourseCommentRow = ({
  comment, courseId,
  resolveMutationPending, deleteMutationPending,
  onResolve, onDelete, isReply = false,
}: CourseCommentRowProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className={`lifecycle-comment mb-2 p-2 border rounded ${comment.resolved ? 'text-muted' : ''} ${isReply ? 'ms-3' : ''}`}>
      <div className="d-flex justify-content-between align-items-start">
        <span className="small font-weight-bold">{comment.author}</span>
        <div className="d-flex gap-1 align-items-center">
          {comment.resolved && <Badge variant="light" className="small">Resolved</Badge>}
          {!isReply && !comment.resolved && (
            <Button
              variant="link"
              size="sm"
              className="p-0"
              disabled={resolveMutationPending}
              onClick={() => onResolve(comment.id)}
            >
              Resolve
            </Button>
          )}
          <Button
            variant="link"
            size="sm"
            className="p-0 text-danger"
            disabled={deleteMutationPending}
            onClick={() => onDelete(comment.id)}
          >
            Delete
          </Button>
        </div>
      </div>
      <p className="small mb-1">{comment.comment}</p>
      <span className="x-small text-muted">{new Date(comment.created).toLocaleDateString()}</span>

      {/* Nested replies (only for top-level comments) */}
      {!isReply && comment.replies?.map((reply) => (
        <CourseCommentRow
          key={reply.id}
          comment={reply}
          courseId={courseId}
          resolveMutationPending={resolveMutationPending}
          deleteMutationPending={deleteMutationPending}
          onResolve={onResolve}
          onDelete={onDelete}
          isReply
        />
      ))}

      {!isReply && !showReplyForm && (
        <Button
          variant="link"
          size="sm"
          className="p-0 mt-1"
          onClick={() => setShowReplyForm(true)}
        >
          Reply
        </Button>
      )}
      {!isReply && showReplyForm && (
        <CourseReplyForm
          commentId={comment.id}
          courseId={courseId}
          onCancel={() => setShowReplyForm(false)}
        />
      )}
    </div>
  );
};

interface Props {
  courseId: string;
}

export const CourseCommentsPanel = ({ courseId }: Props) => {
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useCourseComments(courseId);

  const resolveMutation = useMutation({
    mutationFn: (commentId: number) => resolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.courseComments(courseId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleQueryKeys.courseComments(courseId) });
    },
  });

  return (
    <Collapsible title="Comments" className="lifecycle-comments mt-3">
      <Collapsible.Trigger className="d-flex align-items-center justify-content-between w-100 border-0 bg-transparent p-0">
        <span className="small font-weight-bold">Comments</span>
        {comments && comments.length > 0 && (
          <Badge variant="light">{comments.length}</Badge>
        )}
      </Collapsible.Trigger>
      <Collapsible.Body>
        {isLoading && <Spinner animation="border" size="sm" />}
        {comments && comments.length === 0 && (
          <p className="small text-muted mb-2">No comments yet.</p>
        )}
        {comments?.map((c) => (
          <CourseCommentRow
            key={c.id}
            comment={c}
            courseId={courseId}
            resolveMutationPending={resolveMutation.isPending}
            deleteMutationPending={deleteMutation.isPending}
            onResolve={(id) => resolveMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </Collapsible.Body>
    </Collapsible>
  );
};
