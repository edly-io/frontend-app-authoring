import React, { useState } from 'react';
import {
  ActionRow, Button, Form, ModalDialog,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  title: { id: 'programs.bulk-trainee-results.fill-column.title', defaultMessage: 'Fill column' },
  subtitle: {
    id: 'programs.bulk-trainee-results.fill-column.subtitle',
    defaultMessage: 'Set {label} to the same score for every editable row on this page.',
  },
  scoreLabel: {
    id: 'programs.bulk-trainee-results.fill-column.score-label',
    defaultMessage: 'Score (max {maxMarks})',
  },
  cancelBtn: { id: 'programs.bulk-trainee-results.fill-column.cancel-btn', defaultMessage: 'Cancel' },
  applyBtn: { id: 'programs.bulk-trainee-results.fill-column.apply-btn', defaultMessage: 'Apply to page' },
});

export interface FillColumnTarget {
  subsectionId: number;
  label: string;
  maxMarks: number;
}

interface BulkResultsFillColumnModalProps {
  target: FillColumnTarget | null;
  onClose: () => void;
  onApply: (subsectionId: number, value: number) => void;
}

const BulkResultsFillColumnModal: React.FC<BulkResultsFillColumnModalProps> = ({
  target, onClose, onApply,
}) => {
  const intl = useIntl();
  const [value, setValue] = useState(0);

  if (!target) {
    return null;
  }

  const handleClose = () => {
    setValue(0);
    onClose();
  };

  const handleApply = () => {
    const numeric = Math.min(Math.max(Number(value) || 0, 0), target.maxMarks);
    onApply(target.subsectionId, numeric);
    handleClose();
  };

  const handleChange = (e) => {
    const inputValue = Math.min(Math.max(Number(e.target.value) || 0, 0), target.maxMarks);
    setValue(inputValue);
  };

  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen
      onClose={handleClose}
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p className="small text-muted">
          {intl.formatMessage(messages.subtitle, { label: target.label })}
        </p>
        <Form.Group className="mb-0">
          <Form.Label>{intl.formatMessage(messages.scoreLabel, { maxMarks: target.maxMarks })}</Form.Label>
          <Form.Control
            type="number"
            min={0}
            max={target.maxMarks}
            value={value}
            onChange={handleChange}
            autoFocus
          />
        </Form.Group>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.cancelBtn)}
          </ModalDialog.CloseButton>
          <Button variant="primary" onClick={handleApply}>
            {intl.formatMessage(messages.applyBtn)}
          </Button>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default BulkResultsFillColumnModal;
