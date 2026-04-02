import { useState } from 'react';
import {
  Badge,
  Button,
  Collapsible,
  Form,
  Spinner,
} from '@openedx/paragon';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import { deleteComment, resolveComment } from '../data/api';
import { lifecycleQueryKeys, useCourseComments, useCreateCourseComment } from '../data/apiHooks';

interface Props {
  courseId: string;
}

export const CourseCommentsPanel = ({ courseId }: Props) => {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  const currentUsername = getAuthenticatedUser()?.username;
  const { data: comments, isLoading } = useCourseComments(courseId);
  const createMutation = useCreateCourseComment(courseId);

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

  const handleAdd = () => {
    if (!newComment.trim()) {
      return;
    }
    createMutation.mutate(newComment.trim(), {
      onSuccess: () => setNewComment(''),
    });
  };

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
          <div
            key={c.id}
            className={`lifecycle-comment mb-2 p-2 border rounded ${c.resolved ? 'text-muted' : ''}`}
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="small font-weight-bold">{c.author}</span>
              <div className="d-flex gap-1 align-items-center">
                {c.resolved && <Badge variant="light" className="small">Resolved</Badge>}
                {!c.resolved && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(c.id)}
                  >
                    Resolve
                  </Button>
                )}
                {c.author === currentUsername && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-danger"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(c.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
            <p className="small mb-1">{c.comment}</p>
            <span className="x-small text-muted">{new Date(c.created).toLocaleDateString()}</span>
          </div>
        ))}
        <Form.Group className="mt-2">
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </Form.Group>
        <Button
          variant="outline-primary"
          size="sm"
          className="mt-1"
          disabled={!newComment.trim() || createMutation.isPending}
          onClick={handleAdd}
        >
          {createMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Add Comment'}
        </Button>
      </Collapsible.Body>
    </Collapsible>
  );
};
