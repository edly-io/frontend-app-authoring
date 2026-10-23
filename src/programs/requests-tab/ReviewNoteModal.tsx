import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Form, StandardModal,
} from '@openedx/paragon';
import messages from './messages';

const NOTE_MAX_LENGTH = 500;

/** What the note modal is confirming: a reject, a withdrawal reject, or a past-dated withdrawal approval. */
export interface NoteReview {
  title: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'success';
  noteRequired: boolean;
  warning?: string;
}

interface ReviewNoteModalProps {
  review: NoteReview;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

/** Collects the reviewer note. Mounted only while open, so each review starts with an empty note. */
const ReviewNoteModal = ({
  review, isSubmitting, onClose, onConfirm,
}: ReviewNoteModalProps) => {
  const intl = useIntl();
  const [note, setNote] = useState('');
  const isConfirmDisabled = isSubmitting || (review.noteRequired && !note.trim());
  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={review.title}
      isFullscreenOnMobile
      footerNode={(
        <>
          <Button variant="tertiary" onClick={onClose}>{intl.formatMessage(messages.cancel)}</Button>
          <Button
            variant={review.confirmVariant}
            onClick={() => onConfirm(note.trim())}
            disabled={isConfirmDisabled}
            className="ml-2"
          >
            {review.confirmLabel}
          </Button>
        </>
      )}
    >
      {review.warning && <Alert variant="warning" className="py-2 px-3 mb-2">{review.warning}</Alert>}
      <Form.Group>
        <Form.Label>
          {intl.formatMessage(review.noteRequired ? messages.noteRequiredLabel : messages.noteOptionalLabel)}
        </Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={note}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
          placeholder={intl.formatMessage(
            review.noteRequired ? messages.noteRequiredPlaceholder : messages.noteOptionalPlaceholder,
          )}
          maxLength={NOTE_MAX_LENGTH}
        />
      </Form.Group>
    </StandardModal>
  );
};

export default ReviewNoteModal;
