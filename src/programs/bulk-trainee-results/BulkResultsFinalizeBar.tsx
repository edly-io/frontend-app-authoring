import React from 'react';
import {
  Button, Card, Stack, StatefulButton,
} from '@openedx/paragon';
import { CheckCircleOutline, Save } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  pageSizeLabel: {
    id: 'programs.bulk-trainee-results.finalize-bar.page-size',
    defaultMessage: '{count, plural, one {# trainee} other {# trainees}} on this page',
  },
  changedCountLabel: {
    id: 'programs.bulk-trainee-results.finalize-bar.changed-count',
    defaultMessage: '{count, plural, one {# unsaved row} other {# unsaved rows}} on this page',
  },
  helpText: {
    id: 'programs.bulk-trainee-results.finalize-bar.help-text',
    defaultMessage: 'Fully-scored trainees will be locked and their results marked final.',
  },
  clearAllBtn: { id: 'programs.bulk-trainee-results.finalize-bar.clear-all-btn', defaultMessage: 'Clear all' },
  saveChangedBtnDefault: { id: 'programs.bulk-trainee-results.finalize-bar.save-changed-btn.default', defaultMessage: 'Save changed rows' },
  saveChangedBtnPending: { id: 'programs.bulk-trainee-results.finalize-bar.save-changed-btn.pending', defaultMessage: 'Saving…' },
  finalizeAllBtnDefault: { id: 'programs.bulk-trainee-results.finalize-bar.finalize-all-btn.default', defaultMessage: 'Finalize eligible on this page' },
  finalizeAllBtnPending: { id: 'programs.bulk-trainee-results.finalize-bar.finalize-all-btn.pending', defaultMessage: 'Finalizing…' },
});

interface BulkResultsFinalizeBarProps {
  pageTraineeCount: number;
  changedCount: number;
  isFinalizing: boolean;
  isSavingChanged: boolean;
  canManage: boolean;
  onFinalizeAll: () => void;
  onSaveChangedRows: () => void;
  onClearAll: () => void;
}

const BulkResultsFinalizeBar: React.FC<BulkResultsFinalizeBarProps> = ({
  pageTraineeCount, changedCount, isFinalizing, isSavingChanged, canManage,
  onFinalizeAll, onSaveChangedRows, onClearAll,
}) => {
  const intl = useIntl();

  if (!canManage) {
    return null;
  }

  return (
    <Card className="bulk-results-finalize-bar mt-3">
      <Card.Body className="p-3">
        <Stack direction="horizontal" gap={4} className="flex-wrap align-items-center justify-content-between">
          <div>
            <div className="font-weight-bold">
              {intl.formatMessage(messages.pageSizeLabel, { count: pageTraineeCount })}
              {changedCount > 0 && (
                <span className="text-warning-800 font-weight-normal ml-2">
                  · {intl.formatMessage(messages.changedCountLabel, { count: changedCount })}
                </span>
              )}
            </div>
            <div className="small text-muted">{intl.formatMessage(messages.helpText)}</div>
          </div>

          <Stack direction="horizontal" gap={2} className="flex-wrap">
            <Button
              variant="tertiary"
              onClick={onClearAll}
              disabled={changedCount === 0}
            >
              {intl.formatMessage(messages.clearAllBtn)}
            </Button>

            <StatefulButton
              variant="outline-primary"
              iconBefore={Save}
              state={isSavingChanged ? 'pending' : 'default'}
              disabledStates={['pending']}
              disabled={changedCount === 0}
              labels={{
                default: intl.formatMessage(messages.saveChangedBtnDefault),
                pending: intl.formatMessage(messages.saveChangedBtnPending),
              }}
              onClick={onSaveChangedRows}
            />

            <StatefulButton
              variant="primary"
              iconBefore={CheckCircleOutline}
              state={isFinalizing ? 'pending' : 'default'}
              disabledStates={['pending']}
              labels={{
                default: intl.formatMessage(messages.finalizeAllBtnDefault),
                pending: intl.formatMessage(messages.finalizeAllBtnPending),
              }}
              onClick={onFinalizeAll}
            />
          </Stack>
        </Stack>
      </Card.Body>
    </Card>
  );
};

export default BulkResultsFinalizeBar;
