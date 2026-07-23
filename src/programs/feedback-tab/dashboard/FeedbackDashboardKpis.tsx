import React from 'react';
import {
  Card,
  Col,
  Row,
} from '@openedx/paragon';
import type { FeedbackDashboardSummary } from './types';
import { formatPercent, roundTo } from './feedbackDashboardUtils';

interface KpiDefinition {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}

interface FeedbackDashboardKpisProps {
  summary: FeedbackDashboardSummary;
}

const FeedbackDashboardKpis: React.FC<FeedbackDashboardKpisProps> = ({ summary }) => {
  const kpis: KpiDefinition[] = [
    {
      id: 'evaluated',
      label: 'People evaluated',
      value: String(summary.subjectCount),
      detail: 'with star-rated feedback',
      tone: 'primary',
    },
    {
      id: 'average',
      label: 'Average rating',
      value: `${roundTo(summary.averageRating, 2).toFixed(2)} / 5`,
      detail: `${summary.submittedResponses} submitted responses`,
      tone: 'warning',
    },
    {
      id: 'top',
      label: 'Top rated',
      value: summary.topSubjectName,
      detail: `${roundTo(summary.topSubjectRating, 2).toFixed(2)} / 5 average`,
      tone: 'success',
    },
    {
      id: 'attention',
      label: 'Needs attention',
      value: `${summary.needsAttentionCount}`,
      detail: `${formatPercent(summary.responseRate)} response rate`,
      tone: 'danger',
    },
  ];

  return (
    <Row className="feedback-dashboard-kpis mb-3">
      {kpis.map((kpi) => (
        <Col xs={12} md={6} xl={3} key={kpi.id} className="mb-3 mb-xl-0">
          <Card className={`feedback-dashboard-kpi feedback-dashboard-kpi-${kpi.tone}`}>
            <Card.Section>
              <p className="feedback-dashboard-kpi-label">{kpi.label}</p>
              <p className="feedback-dashboard-kpi-value">{kpi.value}</p>
              <p className="feedback-dashboard-kpi-detail">{kpi.detail}</p>
            </Card.Section>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default FeedbackDashboardKpis;
