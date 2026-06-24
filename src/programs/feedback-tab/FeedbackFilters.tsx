import React from 'react';
import {
  Form,
  Row,
  Col,
  SearchField,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type {
  FeedbackFilterOptions,
  FeedbackFiltersState,
} from '../data/types';

const messages = defineMessages({
  feedbackName: { id: 'programs.feedback.filters.feedback-name', defaultMessage: 'Feedback Name' },
  instructor: { id: 'programs.feedback.filters.instructor', defaultMessage: 'Instructor' },
  trainee: { id: 'programs.feedback.filters.trainee', defaultMessage: 'Trainee' },
  status: { id: 'programs.feedback.filters.status', defaultMessage: 'Status' },
  instructorPlaceholder: { id: 'programs.feedback.filters.instructor.placeholder', defaultMessage: 'Search instructor' },
  traineePlaceholder: { id: 'programs.feedback.filters.trainee.placeholder', defaultMessage: 'Search trainee' },
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

  const handleChange = (field: keyof FeedbackFiltersState) => (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    onChange({
      ...filters,
      [field]: event.target.value,
    });
  };

  const handleSearchChange = (field: 'instructor' | 'trainee') => (value: string) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

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
          <Form.Label>{intl.formatMessage(messages.instructor)}</Form.Label>
          <SearchField
            value={filters.instructor}
            onChange={handleSearchChange('instructor')}
            onSubmit={handleSearchChange('instructor')}
            onClear={() => handleSearchChange('instructor')('')}
            placeholder={intl.formatMessage(messages.instructorPlaceholder)}
          />
        </Form.Group>
      </Col>
      <Col xs={12} md={6} xl={3}>
        <Form.Group className="mb-3">
          <Form.Label>{intl.formatMessage(messages.trainee)}</Form.Label>
          <SearchField
            value={filters.trainee}
            onChange={handleSearchChange('trainee')}
            onSubmit={handleSearchChange('trainee')}
            onClear={() => handleSearchChange('trainee')('')}
            placeholder={intl.formatMessage(messages.traineePlaceholder)}
          />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default FeedbackFilters;
