import React from 'react';
import { Alert } from '@openedx/paragon';

interface FeedbackDashboardEmptyStateProps {
  title: string;
  description: string;
}

const FeedbackDashboardEmptyState: React.FC<FeedbackDashboardEmptyStateProps> = ({
  title,
  description,
}) => (
  <Alert variant="info" className="mb-0">
    <p className="font-weight-bold mb-1">{title}</p>
    <p className="mb-0">{description}</p>
  </Alert>
);

export default FeedbackDashboardEmptyState;
