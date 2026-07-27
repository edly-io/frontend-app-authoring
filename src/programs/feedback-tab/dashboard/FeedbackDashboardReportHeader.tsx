import React from 'react';
import {
  Card,
  Col,
  Form,
  Row,
} from '@openedx/paragon';
import type {
  FeedbackDashboardInitiationOption,
  FeedbackDashboardReport,
  FeedbackDashboardSummary,
} from './types';
import {
  formatPercent,
  RATING_LEVELS,
} from './feedbackDashboardUtils';

interface FeedbackDashboardReportHeaderProps {
  initiatedFeedbackOptions: FeedbackDashboardInitiationOption[];
  selectedInitiationId: number | null;
  selectedReport?: FeedbackDashboardReport;
  summary?: FeedbackDashboardSummary | null;
  onReportChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const FeedbackDashboardReportHeader: React.FC<FeedbackDashboardReportHeaderProps> = ({
  initiatedFeedbackOptions,
  selectedInitiationId,
  selectedReport,
  summary,
  onReportChange,
}) => (
  <Card className="feedback-dashboard-report-card mb-3">
    <Card.Section>
      <div className="feedback-dashboard-heading">
        <div>
          <div className="d-flex align-items-center flex-wrap mb-1">
            <h4 className="mb-0 mr-2">Feedback Summary</h4>
          </div>
          <p className="text-muted small mb-0">
            Star-rated feedback summary for reviewed people in this program.
          </p>
        </div>
      </div>

      <Row className="feedback-dashboard-report-meta">
        <Col xs={12} lg={4}>
          <Form.Group className="mb-3 mb-lg-0">
            <Form.Label className="feedback-dashboard-meta-label">Feedback Name</Form.Label>
            <Form.Control as="select" value={selectedInitiationId ?? ''} onChange={onReportChange}>
              {initiatedFeedbackOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.feedbackName}</option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
        <Col xs={12} md={4} lg={2}>
          <div className="feedback-dashboard-meta-field">
            <span>Program</span>
            <strong>{selectedReport?.programName ?? '--'}</strong>
          </div>
        </Col>
        <Col xs={12} md={4} lg={2}>
          <div className="feedback-dashboard-meta-field">
            <span>Respondents</span>
            <strong>{selectedReport?.respondentsLabel ?? '--'}</strong>
          </div>
        </Col>
        <Col xs={12} md={4} lg={2}>
          <div className="feedback-dashboard-meta-field">
            <span>Response rate</span>
            <strong>{summary ? formatPercent(summary.responseRate) : '--'}</strong>
          </div>
        </Col>
        <Col xs={12} lg={2}>
          <div className="feedback-dashboard-legend">
            {RATING_LEVELS.map((level) => (
              <span key={level.key} className={`feedback-dashboard-legend-item feedback-dashboard-legend-${level.key}`}>
                <span aria-hidden="true" />
                {level.shortLabel}
              </span>
            ))}
          </div>
        </Col>
      </Row>
    </Card.Section>
  </Card>
);

export default FeedbackDashboardReportHeader;
