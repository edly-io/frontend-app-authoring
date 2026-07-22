import React from 'react';
import {
  Card, ProgressBar, Spinner, Stack,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { CourseScore } from './data/types';

const messages = defineMessages({
  title: { id: 'programs.trainee-results.course-scores.title', defaultMessage: 'edX course progress' },
  subtitle: {
    id: 'programs.trainee-results.course-scores.subtitle',
    defaultMessage: 'Read-only, synced automatically from course activity.',
  },
  loadingAria: { id: 'programs.trainee-results.course-scores.loading-aria', defaultMessage: 'Loading course progress' },
  empty: { id: 'programs.trainee-results.course-scores.empty', defaultMessage: 'No course activity yet.' },
  percentageCaption: { id: 'programs.trainee-results.course-scores.percentage-caption', defaultMessage: '{percentage}%' },
});

interface CourseScoresCardProps {
  courseScores: CourseScore[];
  isLoading: boolean;
}

const CourseScoresCard: React.FC<CourseScoresCardProps> = ({ courseScores, isLoading }) => {
  const intl = useIntl();

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center py-3">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loadingAria)} />
        </div>
      );
    }
    if (courseScores.length === 0) {
      return <p className="text-muted small mb-0">{intl.formatMessage(messages.empty)}</p>;
    }
    return (
      <Stack gap={3}>
        {courseScores.map((courseScore) => (
          <div key={courseScore.courseId}>
            <div className="d-flex justify-content-between align-items-center small mb-1">
              <span className="fw-bold text-truncate pr-2">{courseScore.courseName}</span>
              <span className="text-muted flex-shrink-0">
                {intl.formatMessage(
                  messages.percentageCaption,
                  { percentage: Math.round(courseScore.percent) },
                )}
              </span>
            </div>
            <ProgressBar now={courseScore.percent} className="mb-2 border-0 rounded-lg" />
            {courseScore.modules.length > 0 && (
              <Stack gap={1}>
                {courseScore.modules.map((module) => (
                  <div key={module.name} className="d-flex justify-content-between small text-muted">
                    <span className="text-truncate pr-2">{module.name}</span>
                    <span className="flex-shrink-0">
                      {intl.formatMessage(
                        messages.percentageCaption,
                        { percentage: Math.round(module.grade) },
                      )}
                    </span>
                  </div>
                ))}
              </Stack>
            )}
          </div>
        ))}
      </Stack>
    );
  };

  return (
    <Card>
      <Card.Body>
        <span className="text-uppercase small text-muted fw-bold">{intl.formatMessage(messages.title)}</span>
        <p className="small text-muted mb-3">{intl.formatMessage(messages.subtitle)}</p>
        {renderBody()}
      </Card.Body>
    </Card>
  );
};

export default CourseScoresCard;
