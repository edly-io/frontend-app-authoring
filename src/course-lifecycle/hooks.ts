import { useEffect, useRef, useState } from 'react';

/**
 * Fires `onPublished` once when `lifecycleState` transitions from any non-published state
 * to 'published'. Safe to use with an unstable callback reference (captured via ref).
 */
export function useRefreshOnPublish(
  lifecycleState: string | null | undefined,
  onPublished: () => void,
): void {
  const prevStateRef = useRef<string | null | undefined>(undefined);
  const onPublishedRef = useRef(onPublished);
  onPublishedRef.current = onPublished;

  useEffect(() => {
    if (
      prevStateRef.current !== undefined
      && prevStateRef.current !== 'published'
      && lifecycleState === 'published'
    ) {
      onPublishedRef.current();
    }
    prevStateRef.current = lifecycleState;
  }, [lifecycleState]);
}

interface RequestChangesMutation {
  mutate: (comments: string[], options?: { onSuccess?: () => void }) => void;
}

/**
 * Manages the inline "Request Changes" form: visibility toggle, comment text,
 * and submit handler. Pass the appropriate mutation (block or course level).
 */
export function useRequestChangesForm(mutation: RequestChangesMutation) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestComment, setRequestComment] = useState('');

  const open = () => setShowRequestForm(true);
  const cancel = () => {
    setShowRequestForm(false);
    setRequestComment('');
  };
  const submit = () => {
    const trimmed = requestComment.trim();
    if (!trimmed) { return; }
    mutation.mutate([trimmed], {
      onSuccess: () => {
        setShowRequestForm(false);
        setRequestComment('');
      },
    });
  };

  return {
    showRequestForm, requestComment, setRequestComment, open, cancel, submit,
  };
}
