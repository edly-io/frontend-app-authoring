import React, { useState } from 'react';
import {
  Badge, Card, Col, Icon, IconButton, ProgressBar, Row, Spinner,
} from '@openedx/paragon';
import { ExpandLess, ExpandMore, School } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { CourseScore, TraineeCourseScores } from './data/types';

const messages = defineMessages({
  title: { id: 'programs.trainee-results.course-scores.title', defaultMessage: 'edX Course Scores' },
  subtitle: {
    id: 'programs.trainee-results.course-scores.subtitle',
    defaultMessage: 'Read-only, synced automatically from course activity.',
  },
  aggregateLabel: { id: 'programs.trainee-results.course-scores.aggregate-label', defaultMessage: 'Aggregate' },
  loadingAria: { id: 'programs.trainee-results.course-scores.loading-aria', defaultMessage: 'Loading course scores' },
  empty: { id: 'programs.trainee-results.course-scores.empty', defaultMessage: 'No course activity yet.' },
  moduleCount: {
    id: 'programs.trainee-results.course-scores.module-count',
    defaultMessage: '{count, plural, one {# module} other {# modules}}',
  },
  percentageCaption: { id: 'programs.trainee-results.course-scores.percentage-caption', defaultMessage: '{percentage}%' },
  passLabel: { id: 'programs.trainee-results.course-scores.pass', defaultMessage: 'Pass' },
  failLabel: { id: 'programs.trainee-results.course-scores.fail', defaultMessage: 'Fail' },
  expandAlt: { id: 'programs.trainee-results.course-scores.expand-alt', defaultMessage: 'Expand course details' },
  collapseAlt: { id: 'programs.trainee-results.course-scores.collapse-alt', defaultMessage: 'Collapse course details' },
});

interface CourseScoreCardProps {
  courseScore: CourseScore;
}

const CourseScoreCard: React.FC<CourseScoreCardProps> = ({ courseScore }) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <Card.Body className="p-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="d-flex align-items-start gap-2 text-truncate">
            <IconButton
              src={isExpanded ? ExpandLess : ExpandMore}
              alt={intl.formatMessage(isExpanded ? messages.collapseAlt : messages.expandAlt)}
              size="inline"
              className="flex-shrink-0 mr-1"
              onClick={() => setIsExpanded((prev) => !prev)}
            />
            <div className="text-truncate">
              <div className="text-truncate pr-3">{courseScore.courseName}</div>
              <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                <span className="text-primary mr-2 font-weight-bold">{courseScore.courseCode}</span>
                <Badge variant="light" className="text-muted">
                  {intl.formatMessage(messages.moduleCount, { count: courseScore.moduleCount })}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div>
              {courseScore.percent > 0 ? intl.formatMessage(messages.percentageCaption, {
                percentage: Math.round(courseScore.percent),
              }) : '—'}
              {courseScore.letterGrade && (
                <span className="text-muted ml-1">({courseScore.letterGrade})</span>
              )}
            </div>
            <Badge variant={courseScore.passed ? 'success' : 'danger'}>
              {intl.formatMessage(courseScore.passed ? messages.passLabel : messages.failLabel)}
            </Badge>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-top">
            {courseScore.modules.map((module) => (
              <div key={module.name} className="mb-2">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-truncate pr-2">{module.name}</span>
                  <span className="text-muted flex-shrink-0">
                    {Math.round(module.grade)}/{Math.round(module.weight)}
                  </span>
                </div>
                <ProgressBar variant="success-800" now={module.grade} className="course-score-progress border-0 rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

interface CourseScoresSectionProps {
  courseScores?: TraineeCourseScores;
  isLoading: boolean;
}

const CourseScoresSection: React.FC<CourseScoresSectionProps> = ({ courseScores, isLoading }) => {
  const intl = useIntl();
  const courses = courseScores?.courses ?? [];

  return (
    <Card className="mb-3">
      <Card.Body className="p-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <Icon src={School} size="lg" className="text-primary mr-2" />
            <div>
              <div className="font-weight-bold">{intl.formatMessage(messages.title)}</div>
              <div className="small text-muted">{intl.formatMessage(messages.subtitle)}</div>
            </div>
          </div>
          {!isLoading && (
            <div className="text-right">
              <div className="text-uppercase small text-muted font-weight-bold">
                {intl.formatMessage(messages.aggregateLabel)}
              </div>
              <div className="h3 mb-0 font-weight-bold text-primary">
                {
                  (courseScores?.aggregatePercent ?? 0) > 0
                    ? intl.formatMessage(
                      messages.percentageCaption,
                      { percentage: Math.round(courseScores?.aggregatePercent ?? 0) },
                    )
                    : '—'
                }
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loadingAria)} />
          </div>
        )}

        {!isLoading && courses.length === 0 && (
          <p className="text-muted small mb-0">{intl.formatMessage(messages.empty)}</p>
        )}

        {!isLoading && courses.length > 0 && (
          <Row className="course-score-card-row">
            {courses.map((courseScore) => (
              <Col key={courseScore.courseId} xs={12}>
                <CourseScoreCard courseScore={courseScore} />
              </Col>
            ))}
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};

export default CourseScoresSection;
