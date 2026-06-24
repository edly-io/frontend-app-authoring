import React from 'react';
import {
  Button,
  Card,
  Form,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type {
  FeedbackFormQuestion,
  FeedbackQuestionType,
} from '../data/types';

const messages = defineMessages({
  questionText: { id: 'programs.feedback.editor.question.text', defaultMessage: 'Question Text' },
  questionType: { id: 'programs.feedback.editor.question.type', defaultMessage: 'Question Type' },
  required: { id: 'programs.feedback.editor.question.required', defaultMessage: 'Required' },
  remove: { id: 'programs.feedback.editor.question.remove', defaultMessage: 'Delete' },
  starRating: { id: 'programs.feedback.editor.question.type.rating', defaultMessage: 'Star Rating' },
  textarea: { id: 'programs.feedback.editor.question.type.textarea', defaultMessage: 'Comment Box' },
});

interface FeedbackQuestionEditorProps {
  question: FeedbackFormQuestion;
  onQuestionChange: (questionId: number, field: keyof FeedbackFormQuestion, value: string | boolean) => void;
  onRemove: (questionId: number) => void;
  canRemove: boolean;
}

const FeedbackQuestionEditor: React.FC<FeedbackQuestionEditorProps> = ({
  question,
  onQuestionChange,
  onRemove,
  canRemove,
}) => {
  const intl = useIntl();

  return (
    <Card className="mb-3">
      <Card.Section>
        <Form.Group className="mb-3">
          <Form.Label>{intl.formatMessage(messages.questionText)}</Form.Label>
          <Form.Control
            value={question.question}
            onChange={(event) => onQuestionChange(question.id, 'question', event.target.value)}
          />
        </Form.Group>

        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
          <div className="d-flex flex-column flex-md-row">
            <Form.Group className="mb-3 mb-md-0 mr-md-3">
              <Form.Label>{intl.formatMessage(messages.questionType)}</Form.Label>
              <Form.Control
                as="select"
                value={question.type}
                onChange={(event) => onQuestionChange(
                  question.id,
                  'type',
                  event.target.value as FeedbackQuestionType,
                )}
                disabled={question.type === 'textarea' && question.isDefault}
              >
                <option value="star_rating">{intl.formatMessage(messages.starRating)}</option>
                <option value="textarea">{intl.formatMessage(messages.textarea)}</option>
              </Form.Control>
            </Form.Group>

            <Form.Checkbox
              checked={question.required}
              onChange={(event) => onQuestionChange(question.id, 'required', event.target.checked)}
              className="mb-3 mb-md-0 align-self-md-end"
            >
              {intl.formatMessage(messages.required)}
            </Form.Checkbox>
          </div>

          {canRemove && (
            <Button variant="outline-danger" size="sm" onClick={() => onRemove(question.id)}>
              {intl.formatMessage(messages.remove)}
            </Button>
          )}
        </div>
      </Card.Section>
    </Card>
  );
};

export default FeedbackQuestionEditor;
