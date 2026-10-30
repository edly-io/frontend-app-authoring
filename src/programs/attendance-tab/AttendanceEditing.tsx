import React, { useContext, useMemo, useState } from 'react';
import { useMutationState } from '@tanstack/react-query';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Form, Stack, StandardModal,
} from '@openedx/paragon';
import { extractApiError } from '@edly-io/frontend-component-fbr';
import { ToastContext } from '@src/generic/toast-context';
import { attendanceKeys, useMarkAttendance, type MarkAttendanceVariables } from './data/apiHooks';
import type { AttendanceMark } from './data/types';
import messages from './messages';

/** One learner in one session. */
export interface AttendanceTarget {
  sessionId: string;
  userId: number;
}

interface ReasonTarget extends AttendanceTarget {
  status: string;
}

interface NoteTarget extends AttendanceTarget {
  status: string;
  notes: string;
}

const targetKey = ({ sessionId, userId }: AttendanceTarget) => `${sessionId}:${userId}`;

/**
 * Marks attendance from a roster or a learner's history. Changing a status that already has a
 * record needs a reason; notes ride on the same endpoint. Saved data refetches by invalidation.
 */
export const useAttendanceEditing = () => {
  const intl = useIntl();
  const { showToast } = useContext(ToastContext);
  const markMutation = useMarkAttendance();
  const [error, setError] = useState('');
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget | null>(null);
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);

  const save = async ({ sessionId }: AttendanceTarget, record: AttendanceMark) => {
    await markMutation.mutateAsync({ sessionId, records: [record] });
    showToast(intl.formatMessage(messages.saved));
  };

  const saveStatus = async (target: AttendanceTarget, status: string, reason?: string) => {
    setError('');
    try {
      await save(target, { user_id: target.userId, status, ...(reason ? { reason } : {}) });
    } catch (err) {
      setError(extractApiError(err as Error, intl.formatMessage(messages.saveError)));
    }
  };

  // Every save still in flight, not just the latest: marking a second learner must not unlock the first.
  const pendingMarks = useMutationState({
    filters: { mutationKey: attendanceKeys.mark, status: 'pending' },
    select: (mutation) => mutation.state.variables as MarkAttendanceVariables,
  });
  const savingKeys = useMemo(() => new Set(pendingMarks.map(({ sessionId, records }) => (
    targetKey({ sessionId, userId: records[0]?.user_id })
  ))), [pendingMarks]);

  return {
    error,
    clearError: () => setError(''),
    isSaving: (target: AttendanceTarget) => savingKeys.has(targetKey(target)),
    changeStatus: (target: AttendanceTarget, status: string, hasRecord: boolean) => (
      hasRecord ? setReasonTarget({ ...target, status }) : saveStatus(target, status)
    ),
    openNote: (target: AttendanceTarget, status: string, notes: string) => setNoteTarget({ ...target, status, notes }),
    reasonTarget,
    noteTarget,
    closeReason: () => setReasonTarget(null),
    confirmReason: (reason: string) => {
      if (!reasonTarget) { return; }
      setReasonTarget(null);
      saveStatus(reasonTarget, reasonTarget.status, reason);
    },
    closeNote: () => setNoteTarget(null),
    saveNote: async (notes: string) => {
      if (!noteTarget) { return; }
      await save(noteTarget, { user_id: noteTarget.userId, status: noteTarget.status, notes });
      setNoteTarget(null);
    },
    isNoteSaving: markMutation.isPending,
  };
};

type AttendanceEditing = ReturnType<typeof useAttendanceEditing>;

const ReasonModal = ({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) => {
  const intl = useIntl();
  const [reason, setReason] = useState('');
  return (
    <StandardModal
      title={intl.formatMessage(messages.reasonTitle)}
      isOpen
      onClose={onClose}
      hasCloseButton
      footerNode={(
        <Stack direction="horizontal" gap={2} className="justify-content-end">
          <Button variant="tertiary" onClick={onClose}>{intl.formatMessage(messages.cancel)}</Button>
          <Button variant="primary" onClick={() => onConfirm(reason.trim())} disabled={!reason.trim()}>
            {intl.formatMessage(messages.confirm)}
          </Button>
        </Stack>
      )}
    >
      <p className="mb-2">{intl.formatMessage(messages.reasonBody)}</p>
      <Form.Control
        as="textarea"
        rows={3}
        value={reason}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
        placeholder={intl.formatMessage(messages.reasonPlaceholder)}
        aria-label={intl.formatMessage(messages.reasonTitle)}
      />
    </StandardModal>
  );
};

interface NoteModalProps {
  initialNotes: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (notes: string) => Promise<void>;
}

const NoteModal = ({
  initialNotes, isSaving, onClose, onSave,
}: NoteModalProps) => {
  const intl = useIntl();
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState('');
  const handleSave = async () => {
    setError('');
    try {
      await onSave(notes);
    } catch (err) {
      setError(extractApiError(err as Error, intl.formatMessage(messages.noteSaveError)));
    }
  };
  return (
    <StandardModal
      title={intl.formatMessage(messages.noteTitle)}
      isOpen
      onClose={onClose}
      hasCloseButton
      isFullscreenOnMobile
      footerNode={(
        <Stack direction="horizontal" gap={2} className="justify-content-end">
          <Button variant="tertiary" onClick={onClose}>{intl.formatMessage(messages.close)}</Button>
          <Button variant="primary" onClick={handleSave} disabled={notes === initialNotes || isSaving}>
            {intl.formatMessage(isSaving ? messages.savingNote : messages.saveNote)}
          </Button>
        </Stack>
      )}
    >
      {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
      <Form.Control
        as="textarea"
        rows={4}
        value={notes}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
        placeholder={intl.formatMessage(messages.notePlaceholder)}
        aria-label={intl.formatMessage(messages.noteTitle)}
      />
    </StandardModal>
  );
};

/** The reason and note modals of `useAttendanceEditing`; each mounts only while open. */
export const AttendanceEditModals = ({ editing }: { editing: AttendanceEditing }) => (
  <>
    {editing.reasonTarget && <ReasonModal onClose={editing.closeReason} onConfirm={editing.confirmReason} />}
    {editing.noteTarget && (
      <NoteModal
        initialNotes={editing.noteTarget.notes}
        isSaving={editing.isNoteSaving}
        onClose={editing.closeNote}
        onSave={editing.saveNote}
      />
    )}
  </>
);
