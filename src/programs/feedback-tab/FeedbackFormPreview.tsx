import React from 'react';
import { Form } from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type {
  FeedbackFormQuestion,
  FeedbackFormTemplate,
} from './feedbackMocks';

const messages = defineMessages({
  sectionTitle: { id: 'programs.feedback.preview.title', defaultMessage: 'Feedback Form Preview' },
  textareaPlaceholder: {
    id: 'programs.feedback.preview.textarea.placeholder',
    defaultMessage: 'Comment',
  },
});

interface FeedbackFormPreviewProps {
  formName?: string;
  questions: FeedbackFormQuestion[];
}

const FeedbackFormPreview: React.FC<FeedbackFormPreviewProps> = ({ formName, questions }) => {
  const intl = useIntl();

  return (
    <div className="mt-4">
      <h4 className="h5 mb-3">{intl.formatMessage(messages.sectionTitle)}</h4>
      {formName && <p className="font-weight-bold mb-4">{formName}</p>}
      {questions.map((question) => (
        <Form.Group key={question.id} className="mb-4">
          <Form.Label className="font-weight-bold">
            {question.question}
          </Form.Label>
          {question.type === 'star_rating' ? (
            <div
              aria-hidden="true"
              className="text-muted"
              style={{ fontSize: '1.125rem', letterSpacing: '0.1em' }}
            >
              {'\u2605'.repeat(5)}
            </div>
          ) : (
            <Form.Control
              as="textarea"
              rows={4}
              disabled
              placeholder={intl.formatMessage(messages.textareaPlaceholder)}
            />
          )}
        </Form.Group>
      ))}
    </div>
  );
};

export default FeedbackFormPreview;
