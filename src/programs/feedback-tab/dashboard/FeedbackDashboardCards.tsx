import React from 'react';
import {
  Badge,
  Card,
  Icon,
} from '@openedx/paragon';
import {
  ChevronRight,
  Comment,
} from '@openedx/paragon/icons';
import UserIdentity from '../../../components/UserIdentity';
import type {
  FeedbackDashboardReport,
  FeedbackDashboardSubject,
  RatingDistribution,
} from './types';
import FeedbackDashboardCommentsSheet from './FeedbackDashboardCommentsSheet';
import {
  formatPercent,
  getDistributionScore,
  getDistributionPercentage,
  getSubjectScore,
  RATING_LEVELS,
  roundTo,
} from './feedbackDashboardUtils';

interface FeedbackDashboardCardsProps {
  programId: string;
  initiationId: number | null;
  report: FeedbackDashboardReport;
  subjects: FeedbackDashboardSubject[];
}

interface DistributionBarProps {
  distribution: RatingDistribution;
}

const DistributionBar: React.FC<DistributionBarProps> = ({ distribution }) => (
  <div className="feedback-dashboard-distribution-bar" aria-hidden="true">
    {RATING_LEVELS.map((level) => (
      <span
        key={level.key}
        className={`feedback-dashboard-distribution-segment feedback-dashboard-distribution-${level.key}`}
        style={{ width: `${getDistributionPercentage(distribution, level)}%` }}
      />
    ))}
  </div>
);

const getBandVariant = (score: number) => {
  if (score >= 4) {
    return 'success';
  }

  if (score >= 3) {
    return 'warning';
  }

  return 'danger';
};

const getBandLabel = (score: number) => {
  if (score >= 4) {
    return 'Top rated';
  }

  if (score >= 3) {
    return 'Mid range';
  }

  return 'Needs attention';
};

const truncateComment = (comment: string, maxLength = 72) => {
  if (comment.length <= maxLength) {
    return comment;
  }

  return `${comment.slice(0, maxLength).trim()}...`;
};

const FeedbackDashboardCards: React.FC<FeedbackDashboardCardsProps> = ({
  programId,
  initiationId,
  report,
  subjects,
}) => {
  const [selectedSubject, setSelectedSubject] = React.useState<FeedbackDashboardSubject | null>(null);

  return (
    <>
      <div className="feedback-dashboard-card-grid">
        {subjects.map((subject, index) => {
          const score = getSubjectScore(subject, report);
          const commentsTotal = subject.commentsSummary?.total ?? 0;
          const latest = subject.commentsSummary?.latest;

          return (
            <Card key={subject.id} className="feedback-dashboard-person-card">
              <Card.Section>
                <div className="feedback-dashboard-person-card-header">
                  <div className="feedback-dashboard-person-identity">
                    <UserIdentity
                      name={subject.name}
                      badges={[subject.role ?? 'Instructor']}
                      avatarValue={subject.avatar ?? ''}
                      size="default"
                    />
                    <p className="feedback-dashboard-person-meta">
                      Rank #{index + 1} of {subjects.length}
                      {subject.subtitle ? ` - ${subject.subtitle}` : ''}
                    </p>
                  </div>
                  <div className="feedback-dashboard-person-score">
                    <p>{roundTo(score, 2).toFixed(2)}</p>
                    <Badge variant={getBandVariant(score)}>{getBandLabel(score)}</Badge>
                  </div>
                </div>

                <div className="feedback-dashboard-criteria-list">
                  {report.criteria.map((criterion) => {
                    const distribution = subject.distributions[criterion.id];
                    const veryGoodOrBetter = getDistributionPercentage(distribution, RATING_LEVELS[0])
                      + getDistributionPercentage(distribution, RATING_LEVELS[1]);

                    return (
                      <div className="feedback-dashboard-criterion" key={`${subject.id}-${criterion.id}`}>
                        <div className="feedback-dashboard-criterion-heading">
                          <span>{criterion.label}</span>
                          <strong>{formatPercent(veryGoodOrBetter)} at V. Good or above</strong>
                        </div>
                        <DistributionBar distribution={distribution} />
                        <p className="feedback-dashboard-criterion-score">
                          Average {roundTo(getDistributionScore(distribution), 2).toFixed(2)} / 5
                        </p>
                      </div>
                    );
                  })}
                </div>

                {commentsTotal > 0 && (
                  <button
                    type="button"
                    className="feedback-dashboard-comments-preview"
                    onClick={() => setSelectedSubject(subject)}
                  >
                    <span className="feedback-dashboard-comments-preview-count">
                      <Icon src={Comment} size="sm" />
                      {commentsTotal} {commentsTotal === 1 ? 'comment' : 'comments'}
                    </span>
                    {latest?.comment && (
                      <span className="feedback-dashboard-comments-preview-text">
                        {`"${truncateComment(latest.comment)}"`}
                      </span>
                    )}
                    <Icon src={ChevronRight} size="sm" className="feedback-dashboard-comments-preview-icon" />
                  </button>
                )}
              </Card.Section>
            </Card>
          );
        })}
      </div>

      <FeedbackDashboardCommentsSheet
        programId={programId}
        initiationId={initiationId}
        subject={selectedSubject}
        isOpen={!!selectedSubject}
        onClose={() => setSelectedSubject(null)}
      />
    </>
  );
};

export default FeedbackDashboardCards;
