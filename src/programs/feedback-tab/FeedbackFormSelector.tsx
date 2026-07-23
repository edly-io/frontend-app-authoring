import React from 'react';
import { Form } from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import {
  CREATE_NEW_FORM_VALUE,
} from './feedbackMocks';
import type { FeedbackFormTemplate } from '../data/types';

const messages = defineMessages({
  label: { id: 'programs.feedback.form-selector.label', defaultMessage: 'Feedback Form' },
  placeholder: { id: 'programs.feedback.form-selector.placeholder', defaultMessage: 'Select feedback form' },
  createNew: { id: 'programs.feedback.form-selector.create-new', defaultMessage: 'Create New Form' },
});

interface FeedbackFormSelectorProps {
  forms: FeedbackFormTemplate[];
  selectedFormId: string;
  onChange: (value: string) => void;
}

const FeedbackFormSelector: React.FC<FeedbackFormSelectorProps> = ({
  forms,
  selectedFormId,
  onChange,
}) => {
  const intl = useIntl();

  return (
    <Form.Group className="mb-4">
      <Form.Label>{intl.formatMessage(messages.label)}</Form.Label>
      <Form.Control as="select" value={selectedFormId} onChange={(event) => onChange(event.target.value)}>
        <option value="">{intl.formatMessage(messages.placeholder)}</option>
        {forms.map((form) => (
          <option key={form.id} value={String(form.id)}>{form.name}</option>
        ))}
        <option value={CREATE_NEW_FORM_VALUE}>{intl.formatMessage(messages.createNew)}</option>
      </Form.Control>
    </Form.Group>
  );
};

export default FeedbackFormSelector;
