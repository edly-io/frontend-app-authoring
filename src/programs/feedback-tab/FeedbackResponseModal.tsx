import React from 'react';
import {
  ActionRow,
  Button,
  ModalDialog,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { FeedbackRequest } from './feedbackMocks';

const messages = defineMessages({
  title: { id: 'programs.feedback.response.modal.title', defaultMessage: 'Feedback Response' },
  feedbackName: { id: 'programs.feedback.response.modal.feedback-name', defaultMessage: 'Feedback Name' },
  feedbackForm: { id: 'programs.feedback.response.modal.feedback-form', defaultMessage: 'Feedback Form' },
  trainee: { id: 'programs.feedback.response.modal.trainee', defaultMessage: 'Trainee' },
  instructor: { id: 'programs.feedback.response.modal.instructor', defaultMessage: 'Instructor' },
  course: { id: 'programs.feedback.response.modal.course', defaultMessage: 'Course' },
  deadline: { id: 'programs.feedback.response.modal.deadline', defaultMessage: 'Deadline' },
  requestedOn: { id: 'programs.feedback.response.modal.requested-on', defaultMessage: 'Requested On' },
  submittedOn: { id: 'programs.feedback.response.modal.submitted-on', defaultMessage: 'Submitted On' },
  answers: { id: 'programs.feedback.response.modal.answers', defaultMessage: 'Answers' },
  close: { id: 'programs.feedback.response.modal.close', defaultMessage: 'Close' },
});

const formatDateOnly = (value: string | null) => {
  if (!value) {
    return '--';
  }

  const match = value.match(/^([A-Za-z]{3} \d{2}, \d{4})/);
  if (match) {
    return match[1];
  }

  return value;
};

interface FeedbackResponseModalProps {
  isOpen: boolean;
  request: FeedbackRequest | null;
  onClose: () => void;
}

const renderAnswerValue = (value: number | string, type: 'star_rating' | 'textarea') => (
  type === 'star_rating' ? `${value}/5` : value || '--'
);

const FeedbackResponseModal: React.FC<FeedbackResponseModalProps> = ({
  isOpen,
  request,
  onClose,
}) => {
  const intl = useIntl();

  if (!request?.response) {
    return null;
  }

  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <div className="mb-4">
          <p className="mb-2"><strong>{intl.formatMessage(messages.feedbackName)}:</strong> {request.feedbackName}</p>
          <p className="mb-2"><strong>{intl.formatMessage(messages.feedbackForm)}:</strong> {request.selectedFormName}</p>
          <p className="mb-2"><strong>{intl.formatMessage(messages.trainee)}:</strong> {request.trainee}</p>
          <p className="mb-2"><strong>{intl.formatMessage(messages.instructor)}:</strong> {request.instructor}</p>
          <p className="mb-2"><strong>{intl.formatMessage(messages.course)}:</strong> {request.course}</p>
          <p className="mb-2"><strong>{intl.formatMessage(messages.deadline)}:</strong> {request.deadline}</p>
          <p className="mb-2"><strong>{intl.formatMessage(messages.requestedOn)}:</strong> {formatDateOnly(request.requestedOn)}</p>
          <p className="mb-0"><strong>{intl.formatMessage(messages.submittedOn)}:</strong> {formatDateOnly(request.submittedOn)}</p>
        </div>

        <div>
          <p className="mb-3 font-weight-bold">{intl.formatMessage(messages.answers)}</p>
          {request.response.answers.map((answer) => (
            <div key={answer.questionId} className="mb-3">
              <p className="mb-1 font-weight-bold">{answer.question}</p>
              <p className="mb-0">{renderAnswerValue(answer.value, answer.type)}</p>
            </div>
          ))}
        </div>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="primary" onClick={onClose}>
            {intl.formatMessage(messages.close)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default FeedbackResponseModal;
