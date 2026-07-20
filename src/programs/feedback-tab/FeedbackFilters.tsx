import React from 'react';
import {
  Form,
  Row,
  Col,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type {
  FeedbackFilterOptions,
  FeedbackFiltersState,
} from '../data/types';
import DebouncedSearchField from './DebouncedSearchField';

const messages = defineMessages({
  feedbackName: { id: 'programs.feedback.filters.feedback-name', defaultMessage: 'Feedback Name' },
  subject: { id: 'programs.feedback.filters.subject', defaultMessage: 'Feedback About' },
  reviewer: { id: 'programs.feedback.filters.reviewer', defaultMessage: 'Requested From' },
  status: { id: 'programs.feedback.filters.status', defaultMessage: 'Status' },
  subjectPlaceholder: { id: 'programs.feedback.filters.subject.placeholder', defaultMessage: 'Search feedback subject' },
  reviewerPlaceholder: { id: 'programs.feedback.filters.reviewer.placeholder', defaultMessage: 'Search reviewer' },
  allFeedbackNames: { id: 'programs.feedback.filters.feedback-name.all', defaultMessage: 'All' },
  allStatuses: { id: 'programs.feedback.filters.status.all', defaultMessage: 'All' },
  pending: { id: 'programs.feedback.filters.status.pending', defaultMessage: 'Pending' },
  completed: { id: 'programs.feedback.filters.status.completed', defaultMessage: 'Completed' },
  notSubmitted: { id: 'programs.feedback.filters.status.not-submitted', defaultMessage: 'Not Submitted' },
});

interface FeedbackFiltersProps {
  filters: FeedbackFiltersState;
  options: FeedbackFilterOptions;
  onChange: (nextFilters: FeedbackFiltersState) => void;
}

const FeedbackFilters: React.FC<FeedbackFiltersProps> = ({
  filters,
  options,
  onChange,
}) => {
  const intl = useIntl();

  const updateFilter = React.useCallback(
    <Field extends keyof FeedbackFiltersState>(field: Field, value: FeedbackFiltersState[Field]) => {
      if (filters[field] === value) {
        return;
      }

      onChange({
        ...filters,
        [field]: value,
      });
    },
    [filters, onChange],
  );

  const handleChange = (field: keyof FeedbackFiltersState) => (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    updateFilter(field, event.target.value as FeedbackFiltersState[typeof field]);
  };

  const handleSubjectSearchChange = React.useCallback(
    (value: string) => updateFilter('subject', value),
    [updateFilter],
  );
  const handleReviewerSearchChange = React.useCallback(
    (value: string) => updateFilter('reviewer', value),
    [updateFilter],
  );

  return (
    <Row className="mb-4">
      <Col xs={12} md={6} xl={3}>
        <Form.Group className="mb-3">
          <Form.Label>{intl.formatMessage(messages.feedbackName)}</Form.Label>
          <Form.Control as="select" value={filters.feedbackName} onChange={handleChange('feedbackName')}>
            <option value="All">{intl.formatMessage(messages.allFeedbackNames)}</option>
            {options.feedbackNames.map((feedbackName) => (
              <option key={feedbackName} value={feedbackName}>{feedbackName}</option>
            ))}
          </Form.Control>
        </Form.Group>
      </Col>
      <Col xs={12} md={6} xl={3}>
        <Form.Group className="mb-3">
          <Form.Label>{intl.formatMessage(messages.status)}</Form.Label>
          <Form.Control as="select" value={filters.status} onChange={handleChange('status')}>
            <option value="All">{intl.formatMessage(messages.allStatuses)}</option>
            <option value="Pending">{intl.formatMessage(messages.pending)}</option>
            <option value="Completed">{intl.formatMessage(messages.completed)}</option>
            <option value="Not Submitted">{intl.formatMessage(messages.notSubmitted)}</option>
          </Form.Control>
        </Form.Group>
      </Col>
      <Col xs={12} md={6} xl={3}>
        <Form.Group className="mb-3">
          <Form.Label>{intl.formatMessage(messages.subject)}</Form.Label>
          <DebouncedSearchField
            value={filters.subject}
            onSearch={handleSubjectSearchChange}
            placeholder={intl.formatMessage(messages.subjectPlaceholder)}
          />
        </Form.Group>
      </Col>
      <Col xs={12} md={6} xl={3}>
        <Form.Group className="mb-3">
          <Form.Label>{intl.formatMessage(messages.reviewer)}</Form.Label>
          <DebouncedSearchField
            value={filters.reviewer}
            onSearch={handleReviewerSearchChange}
            placeholder={intl.formatMessage(messages.reviewerPlaceholder)}
          />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default FeedbackFilters;
