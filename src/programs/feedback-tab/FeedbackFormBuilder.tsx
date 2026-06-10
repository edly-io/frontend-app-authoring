import React from 'react';
import {
  Alert,
  Button,
  Form,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import FeedbackQuestionEditor from './FeedbackQuestionEditor';
import type { FeedbackFormQuestion } from './feedbackMocks';

const messages = defineMessages({
  title: { id: 'programs.feedback.builder.title', defaultMessage: 'Create New Feedback Form' },
  formName: { id: 'programs.feedback.builder.form-name', defaultMessage: 'Form Name' },
  formNamePlaceholder: { id: 'programs.feedback.builder.form-name.placeholder', defaultMessage: 'e.g. Weekly Instructor Feedback' },
  addQuestion: { id: 'programs.feedback.builder.add', defaultMessage: 'Add Question' },
  saveForm: { id: 'programs.feedback.builder.save', defaultMessage: 'Save Form' },
});

interface FeedbackFormBuilderProps {
  formName: string;
  questions: FeedbackFormQuestion[];
  validationError: string;
  onFormNameChange: (value: string) => void;
  onQuestionChange: (questionId: number, field: keyof FeedbackFormQuestion, value: string | boolean) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (questionId: number) => void;
  onSaveForm: () => void;
}

const FeedbackFormBuilder: React.FC<FeedbackFormBuilderProps> = ({
  formName,
  questions,
  validationError,
  onFormNameChange,
  onQuestionChange,
  onAddQuestion,
  onRemoveQuestion,
  onSaveForm,
}) => {
  const intl = useIntl();

  return (
    <div className="mt-4">
      <h4 className="h5 mb-3">{intl.formatMessage(messages.title)}</h4>
      {validationError && (
        <Alert variant="danger" className="mb-3">
          {validationError}
        </Alert>
      )}

      <Form.Group className="mb-4">
        <Form.Label>{intl.formatMessage(messages.formName)}</Form.Label>
        <Form.Control
          value={formName}
          onChange={(event) => onFormNameChange(event.target.value)}
          placeholder={intl.formatMessage(messages.formNamePlaceholder)}
        />
      </Form.Group>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Questions</h5>
        <Button variant="outline-primary" size="sm" onClick={onAddQuestion}>
          {intl.formatMessage(messages.addQuestion)}
        </Button>
      </div>

      {questions.map((question) => {
        const canRemove = !question.isDefault;

        return (
          <FeedbackQuestionEditor
            key={question.id}
            question={question}
            onQuestionChange={onQuestionChange}
            onRemove={onRemoveQuestion}
            canRemove={canRemove}
          />
        );
      })}

      <Button variant="primary" onClick={onSaveForm}>
        {intl.formatMessage(messages.saveForm)}
      </Button>
    </div>
  );
};

export default FeedbackFormBuilder;
