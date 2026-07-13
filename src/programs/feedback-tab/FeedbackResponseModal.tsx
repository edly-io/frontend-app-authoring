import React from 'react';
import {
  ActionRow,
  Alert,
  Button,
  ModalDialog,
  Spinner,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useFeedbackRequestDetail } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'programs.feedback.response.modal.title', defaultMessage: 'Feedback Response' },
  feedbackName: { id: 'programs.feedback.response.modal.feedback-name', defaultMessage: 'Feedback Name' },
  feedbackForm: { id: 'programs.feedback.response.modal.feedback-form', defaultMessage: 'Feedback Form' },
  reviewer: { id: 'programs.feedback.response.modal.reviewer', defaultMessage: 'Requested From' },
  subject: { id: 'programs.feedback.response.modal.subject', defaultMessage: 'Feedback About' },
  course: { id: 'programs.feedback.response.modal.course', defaultMessage: 'Course' },
  deadline: { id: 'programs.feedback.response.modal.deadline', defaultMessage: 'Deadline' },
  requestedOn: { id: 'programs.feedback.response.modal.requested-on', defaultMessage: 'Requested On' },
  submittedOn: { id: 'programs.feedback.response.modal.submitted-on', defaultMessage: 'Submitted On' },
  answers: { id: 'programs.feedback.response.modal.answers', defaultMessage: 'Answers' },
  close: { id: 'programs.feedback.response.modal.close', defaultMessage: 'Close' },
  loading: { id: 'programs.feedback.response.modal.loading', defaultMessage: 'Loading feedback response...' },
  loadError: { id: 'programs.feedback.response.modal.error', defaultMessage: 'Failed to load feedback response.' },
  noResponse: { id: 'programs.feedback.response.modal.empty', defaultMessage: 'No submitted response is available for this request.' },
});

const formatDateOnly = (value: string | null) => {
  if (!value) {
    return '--';
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  const match = value.match(/^([A-Za-z]{3} \d{2}, \d{4})/);
  if (match) {
    return match[1];
  }

  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  return value;
};

interface FeedbackResponseModalProps {
  isOpen: boolean;
  programId: string;
  requestId: number | null;
  onClose: () => void;
}

const renderAnswerValue = (
  starValue: number | null,
  textValue: string | null,
  type: 'star_rating' | 'textarea',
) => (
  type === 'star_rating' ? `${starValue ?? '--'}/5` : textValue || '--'
);

const FeedbackResponseModal: React.FC<FeedbackResponseModalProps> = ({
  isOpen,
  programId,
  requestId,
  onClose,
}) => {
  const intl = useIntl();
  const {
    data: request,
    isLoading,
    isError,
  } = useFeedbackRequestDetail(programId, requestId, isOpen);

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
        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
          </div>
        )}

        {!isLoading && isError && (
          <Alert variant="danger" className="mb-0">
            {intl.formatMessage(messages.loadError)}
          </Alert>
        )}

        {!isLoading && !isError && request && !request.response && (
          <Alert variant="warning" className="mb-0">
            {intl.formatMessage(messages.noResponse)}
          </Alert>
        )}

        {!isLoading && !isError && request?.response && (
          <>
            <div className="mb-4">
              <p className="mb-2"><strong>{intl.formatMessage(messages.feedbackName)}:</strong> {request.feedbackName}</p>
              <p className="mb-2"><strong>{intl.formatMessage(messages.feedbackForm)}:</strong> {request.formName}</p>
              <p className="mb-2"><strong>{intl.formatMessage(messages.reviewer)}:</strong> {request.reviewerName}</p>
              <p className="mb-2"><strong>{intl.formatMessage(messages.subject)}:</strong> {request.subjectName || '--'}</p>
              <p className="mb-2"><strong>{intl.formatMessage(messages.course)}:</strong> {request.courseId}</p>
              <p className="mb-2"><strong>{intl.formatMessage(messages.deadline)}:</strong> {formatDateOnly(request.deadline)}</p>
              <p className="mb-2"><strong>{intl.formatMessage(messages.requestedOn)}:</strong> {formatDateOnly(request.created)}</p>
              <p className="mb-0"><strong>{intl.formatMessage(messages.submittedOn)}:</strong> {formatDateOnly(request.submittedAt)}</p>
            </div>

            <div>
              <p className="mb-3 font-weight-bold">{intl.formatMessage(messages.answers)}</p>
              {request.response.answers.map((answer) => (
                <div key={answer.id ?? answer.questionId} className="mb-3">
                  <p className="mb-1 font-weight-bold">{answer.question}</p>
                  <p className="mb-0">{renderAnswerValue(answer.starValue, answer.textValue, answer.type)}</p>
                </div>
              ))}
            </div>
          </>
        )}
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
