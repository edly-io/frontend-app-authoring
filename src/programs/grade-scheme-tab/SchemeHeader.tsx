import React from 'react';
import {
  Badge, Card, Col, Form, Icon, IconButton, Row, Spinner,
} from '@openedx/paragon';
import { Check, Lock } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { SchemeStatus } from './data/types';

const messages = defineMessages({
  schemeNameLabel: { id: 'programs.scheme.scheme-name.label', defaultMessage: 'Scheme name' },
  targetTotalLabel: { id: 'programs.scheme.target-total.label', defaultMessage: 'Target total' },
  statusLabel: { id: 'programs.scheme.status.label', defaultMessage: 'Status' },
  statusDraft: { id: 'programs.scheme.status.draft', defaultMessage: 'Draft' },
  statusPublished: { id: 'programs.scheme.status.published', defaultMessage: 'Published' },
  targetTotalLockedHint: {
    id: 'programs.scheme.target-total-locked-hint',
    defaultMessage: 'Unpublish the scheme to change the target total.',
  },
  saveNameAria: { id: 'programs.scheme.save-name-aria', defaultMessage: 'Save scheme name' },
});

interface SchemeHeaderProps {
  name: string;
  targetTotal: number;
  status: SchemeStatus;
  canManage: boolean;
  isTreeEditable: boolean;
  isNameDirty: boolean;
  isRenamePending: boolean;
  onNameChange: (name: string) => void;
  onNameCommit: () => void;
  onTargetTotalChange: (targetTotal: number) => void;
}

const SchemeHeader: React.FC<SchemeHeaderProps> = ({
  name,
  targetTotal,
  status,
  canManage,
  isTreeEditable,
  isNameDirty,
  isRenamePending,
  onNameChange,
  onNameCommit,
  onTargetTotalChange,
}) => {
  const intl = useIntl();

  return (
    <Card className="mb-3">
      <Card.Body className="p-3">
        <Row className="g-3 align-items-start">
          <Col xs={12} md={5}>
            <Form.Group className="mb-0">
              <Form.Label className="text-uppercase small text-muted fw-bold">
                {intl.formatMessage(messages.schemeNameLabel)}
              </Form.Label>
              <div className="d-flex align-items-center gap-2">
                <Form.Control
                  value={name}
                  disabled={!canManage}
                  onChange={(e) => onNameChange(e.target.value)}
                  onBlur={() => {
                    if (!isTreeEditable && isNameDirty) {
                      onNameCommit();
                    }
                  }}
                />
                {!isTreeEditable && canManage && (
                  isRenamePending ? (
                    <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.saveNameAria)} />
                  ) : (
                    <IconButton
                      src={Check}
                      alt={intl.formatMessage(messages.saveNameAria)}
                      variant="primary"
                      aria-disabled={!isNameDirty}
                      className={!isNameDirty ? 'opacity-25' : undefined}
                      onClick={isNameDirty ? onNameCommit : undefined}
                    />
                  )
                )}
              </div>
            </Form.Group>
          </Col>
          <Col xs={6} md={3}>
            <Form.Group className="mb-0">
              <Form.Label className="text-uppercase small text-muted fw-bold">
                {intl.formatMessage(messages.targetTotalLabel)}
              </Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={targetTotal}
                disabled={!canManage || !isTreeEditable}
                onChange={(e) => onTargetTotalChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                title={!isTreeEditable ? intl.formatMessage(messages.targetTotalLockedHint) : undefined}
              />
            </Form.Group>
          </Col>
          <Col xs={6} md={4}>
            <span className="d-block text-uppercase small text-muted fw-bold mb-2">
              {intl.formatMessage(messages.statusLabel)}
            </span>
            <Badge variant={status === 'published' ? 'success' : 'secondary'} className="d-inline-flex align-items-center gap-1 mt-3">
              {!isTreeEditable && <Icon src={Lock} size="xs" />}
              {intl.formatMessage(status === 'published' ? messages.statusPublished : messages.statusDraft)}
            </Badge>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default SchemeHeader;
