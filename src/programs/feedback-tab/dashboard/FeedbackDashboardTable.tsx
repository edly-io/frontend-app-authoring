import React from 'react';
import UserIdentity from '../../../components/UserIdentity';
import type {
  DashboardAggregationMode,
  FeedbackDashboardCriterion,
  FeedbackDashboardReport,
  FeedbackDashboardSubject,
  RatingDistribution,
  RatingLevel,
} from './types';
import {
  formatPercent,
  getAverageDistribution,
  getDistributionCount,
  getDistributionPercentage,
  RATING_LEVELS,
} from './feedbackDashboardUtils';

interface FeedbackDashboardTableProps {
  report: FeedbackDashboardReport;
  subjects: FeedbackDashboardSubject[];
  aggregationMode: DashboardAggregationMode;
  criteria?: FeedbackDashboardCriterion[];
  enableUserHoverCard?: boolean;
}

const getCellClassName = (distribution: RatingDistribution, level: RatingLevel) => {
  const value = getDistributionCount(distribution, level);
  return `feedback-dashboard-rating-cell feedback-dashboard-rating-cell-${level.key}${value === 0 ? ' is-zero' : ''}`;
};

const getTableLevelLabel = (level: RatingLevel) => (
  level.key === 'needsAttention' ? 'Needs Attn.' : level.shortLabel
);

const formatAggregatedValue = (
  distribution: RatingDistribution,
  level: RatingLevel,
  aggregationMode: DashboardAggregationMode,
) => {
  if (aggregationMode === 'count') {
    return String(getDistributionCount(distribution, level));
  }

  return formatPercent(getDistributionPercentage(distribution, level));
};

const FeedbackDashboardTable: React.FC<FeedbackDashboardTableProps> = ({
  report,
  subjects,
  aggregationMode,
  criteria = report.criteria,
  enableUserHoverCard = true,
}) => (
  <div className="feedback-dashboard-table-wrapper">
    <table className="table feedback-dashboard-table mb-0">
      <colgroup>
        <col className="feedback-dashboard-subject-column" />
        {criteria.map((criterion) => (
          RATING_LEVELS.map((level) => (
            <col key={`${criterion.id}-${level.key}`} className="feedback-dashboard-rating-column" />
          ))
        ))}
        {RATING_LEVELS.map((level) => (
          <col key={`average-${level.key}`} className="feedback-dashboard-rating-column" />
        ))}
      </colgroup>
      <thead>
        <tr className="feedback-dashboard-group-row">
          <th rowSpan={2} className="feedback-dashboard-subject-header">Person - Rating</th>
          {criteria.map((criterion) => (
            <th key={criterion.id} scope="colgroup" colSpan={RATING_LEVELS.length} className="feedback-dashboard-group-header">
              {criterion.label}
            </th>
          ))}
          <th scope="colgroup" colSpan={RATING_LEVELS.length} className="feedback-dashboard-group-header feedback-dashboard-average-header">
            Average
          </th>
        </tr>
        <tr className="feedback-dashboard-level-row">
          {[...criteria, { id: 'average', label: 'Average' }].map((criterion) => (
            RATING_LEVELS.map((level) => (
              <th
                key={`${criterion.id}-${level.key}`}
                scope="col"
                className={`feedback-dashboard-level-header feedback-dashboard-level-${level.key}`}
              >
                {getTableLevelLabel(level)}
              </th>
            ))
          ))}
        </tr>
      </thead>
      <tbody>
        {subjects.map((subject) => {
          const averageDistribution = getAverageDistribution(subject, report);

          return (
            <tr key={subject.id}>
              <th scope="row" className="feedback-dashboard-subject-cell">
                <UserIdentity
                  name={subject.name}
                  badges={[subject.role ?? 'Instructor']}
                  size="compact"
                  enableHoverCard={enableUserHoverCard}
                />
              </th>
              {criteria.map((criterion) => {
                const distribution = subject.distributions[criterion.id];

                return RATING_LEVELS.map((level) => (
                  <td key={`${subject.id}-${criterion.id}-${level.key}`}>
                    <span className={getCellClassName(distribution, level)}>
                      {formatAggregatedValue(distribution, level, aggregationMode)}
                    </span>
                  </td>
                ));
              })}
              {RATING_LEVELS.map((level, index) => (
                <td
                  key={`${subject.id}-average-${level.key}`}
                  className={`feedback-dashboard-average-cell${index === 0 ? ' feedback-dashboard-average-cell-first' : ''}`}
                >
                  <span className={getCellClassName(averageDistribution, level)}>
                    {formatAggregatedValue(averageDistribution, level, aggregationMode)}
                  </span>
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default FeedbackDashboardTable;
