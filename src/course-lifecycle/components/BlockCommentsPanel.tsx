import { useState } from 'react';
import {
  Badge,
  Button,
  Collapsible,
  Form,
  Spinner,
} from '@openedx/paragon';

import type { BlockReviewComment } from '../data/types';
import {
  useAddReply,
  useBlockComments,
  useDeleteComment,
  useResolveComment,
} from '../data/apiHooks';

interface ReplyFormProps {
  commentId: number;
  usageKey: string;
  onCancel: () => void;
}

const ReplyForm = ({ commentId, usageKey, onCancel }: ReplyFormProps) => {
  const [text, setText] = useState('');
  const replyMutation = useAddReply(usageKey);

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

interface CommentRowProps {
  comment: BlockReviewComment;
  usageKey: string;
  isReply?: boolean;
}

const CommentRow = ({
  comment, usageKey, isReply = false,
}: CommentRowProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const resolveMutation = useResolveComment(usageKey);
  const deleteMutation = useDeleteComment(usageKey);

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
              disabled={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate(comment.id)}
            >
              Resolve
            </Button>
          )}
          <Button
            variant="link"
            size="sm"
            className="p-0 text-danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(comment.id)}
          >
            Delete
          </Button>
        </div>
      </div>
      <p className="small mb-1">{comment.comment}</p>
      <span className="x-small text-muted">{new Date(comment.created).toLocaleDateString()}</span>

      {/* Replies (only for top-level comments) */}
      {!isReply && comment.replies?.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          usageKey={usageKey}
          isReply
        />
      ))}

      {/* Reply button + form (only for top-level comments) */}
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
        <ReplyForm
          commentId={comment.id}
          usageKey={usageKey}
          onCancel={() => setShowReplyForm(false)}
        />
      )}
    </div>
  );
};

interface Props {
  usageKey: string;
}

export const BlockCommentsPanel = ({ usageKey }: Props) => {
  const { data: comments, isLoading } = useBlockComments(usageKey);

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
          <CommentRow
            key={c.id}
            comment={c}
            usageKey={usageKey}
          />
        ))}
      </Collapsible.Body>
    </Collapsible>
  );
};
