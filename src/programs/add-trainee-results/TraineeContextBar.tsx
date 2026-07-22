import React from 'react';
import {
  Badge, Card, Col, Form, Icon, Row,
} from '@openedx/paragon';
import { Lock } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { TraineeResultStatus, TraineeSummary } from './data/types';

const messages = defineMessages({
  traineeLabel: { id: 'programs.trainee-results.trainee.label', defaultMessage: 'Trainee' },
  statusLabel: { id: 'programs.trainee-results.status.label', defaultMessage: 'Status' },
  statusInProgress: { id: 'programs.trainee-results.status.in-progress', defaultMessage: 'In progress' },
  statusFinalized: { id: 'programs.trainee-results.status.finalized', defaultMessage: 'Finalized' },
});

interface TraineeContextBarProps {
  trainees: TraineeSummary[];
  selectedTraineeId: string;
  onSelectTrainee: (traineeId: string) => void;
  status: TraineeResultStatus;
}

const TraineeContextBar: React.FC<TraineeContextBarProps> = ({
  trainees, selectedTraineeId, onSelectTrainee, status,
}) => {
  const intl = useIntl();

  return (
    <Card className="mb-3">
      <Card.Body className="p-3">
        <Row className="g-3 align-items-end">
          <Col xs={12} md={8}>
            <Form.Group className="mb-0">
              <Form.Label className="text-uppercase small text-muted fw-bold">
                {intl.formatMessage(messages.traineeLabel)}
              </Form.Label>
              <Form.Control
                as="select"
                value={selectedTraineeId}
                onChange={(e) => onSelectTrainee(e.target.value)}
              >
                {trainees.map((trainee) => (
                  <option key={trainee.id} value={trainee.id}>
                    {trainee.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <span className="d-block text-uppercase small text-muted fw-bold mb-2">
              {intl.formatMessage(messages.statusLabel)}
            </span>
            <Badge variant={status === 'finalized' ? 'success' : 'secondary'} className="d-inline-flex align-items-center gap-1">
              {status === 'finalized' && <Icon src={Lock} size="xs" />}
              {intl.formatMessage(status === 'finalized' ? messages.statusFinalized : messages.statusInProgress)}
            </Badge>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default TraineeContextBar;
