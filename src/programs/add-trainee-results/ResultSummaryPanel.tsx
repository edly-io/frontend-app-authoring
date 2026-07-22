import React, { useMemo } from 'react';
import {
  Alert, Card, Icon, ProgressBar, Stack,
} from '@openedx/paragon';
import { CheckCircle, Warning } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { getSectionVariant } from './utils';
import type { EditableSectionScore } from './types';

const messages = defineMessages({
  finalizedTitle: { id: 'programs.trainee-results.summary.finalized.title', defaultMessage: 'Result finalized.' },
  finalizedSubtitle: {
    id: 'programs.trainee-results.summary.finalized.subtitle',
    defaultMessage: 'This trainee’s scores are locked and can no longer be edited.',
  },
  outOfRangeTitle: { id: 'programs.trainee-results.summary.out-of-range.title', defaultMessage: 'Some marks are out of range.' },
  outOfRangeSubtitle: {
    id: 'programs.trainee-results.summary.out-of-range.subtitle',
    defaultMessage: 'Fix highlighted line items before finalizing this result.',
  },
  grandTotalLabel: { id: 'programs.trainee-results.summary.grand-total.label', defaultMessage: 'Grand total' },
  percentageCaption: { id: 'programs.trainee-results.summary.percentage-caption', defaultMessage: '{percentage}%' },
});

interface ResultSummaryPanelProps {
  sections: EditableSectionScore[];
  grandTotal: number;
  maxTotal: number;
  percentage: number;
  hasOutOfRangeErrors: boolean;
  isFinalized: boolean;
}

const ResultSummaryPanel: React.FC<ResultSummaryPanelProps> = ({
  sections, grandTotal, maxTotal, percentage, hasOutOfRangeErrors, isFinalized,
}) => {
  const intl = useIntl();
  const chartScale = Math.max(maxTotal, grandTotal, 1);

  const statusContent = useMemo(() => {
    if (hasOutOfRangeErrors) {
      return {
        icon: Warning, variant: 'danger' as const, title: messages.outOfRangeTitle, subtitle: messages.outOfRangeSubtitle,
      };
    }
    if (isFinalized) {
      return {
        icon: CheckCircle, variant: 'success' as const, title: messages.finalizedTitle, subtitle: messages.finalizedSubtitle,
      };
    }
    return null;
  }, [hasOutOfRangeErrors, isFinalized]);

  return (
    <Stack gap={3} className="sticky-top">
      {statusContent && (
        <Alert variant={statusContent.variant} className="mb-0">
          <div className="d-flex align-items-start gap-2">
            <Icon src={statusContent.icon} className="mr-2" />
            <div className="line-height-20">
              <strong>{intl.formatMessage(statusContent.title)}</strong>
              {' '}
              {intl.formatMessage(statusContent.subtitle)}
            </div>
          </div>
        </Alert>
      )}

      <Card className="p-3">
        <Card.Body>
          <span className="text-uppercase small text-muted fw-bold">
            {intl.formatMessage(messages.grandTotalLabel)}
          </span>
          <div className="d-flex align-items-baseline gap-1 mt-1 justify-content-center">
            <span className="h2 mb-0 fw-bold text-primary">{grandTotal}</span>
            <span className="text-muted">/ {maxTotal}</span>
          </div>
          <p className="small mb-3 text-center text-muted">
            {intl.formatMessage(messages.percentageCaption, { percentage })}
          </p>

          {sections.length > 0 && (
            <>
              <ProgressBar className="mb-3 border-0 rounded-lg">
                {sections.map((section, index) => (
                  <ProgressBar
                    key={section.sectionId}
                    now={(section.subsections.reduce((sum, s) => sum + s.marksAwarded, 0) / chartScale) * 100}
                    className={`bg-${getSectionVariant(index)}-800`}
                  />
                ))}
              </ProgressBar>

              <Stack>
                {sections.map((section, index) => {
                  const sectionTotal = section.subsections.reduce((sum, s) => sum + s.marksAwarded, 0);
                  return (
                    <div key={section.sectionId} className="d-flex align-items-center justify-content-between small border-bottom">
                      <span className="d-flex align-items-center gap-2 text-truncate pr-3">
                        <span
                          aria-hidden="true"
                          className={`bg-${getSectionVariant(index)}-800 rounded-sm flex-shrink-0 mr-2`}
                          style={{ width: 10, height: 10 }}
                        />
                        <span className="text-truncate small">{section.title}</span>
                      </span>
                      <span className="font-weight-bold flex-shrink-0">{sectionTotal} / {section.maxMarks}</span>
                    </div>
                  );
                })}
              </Stack>
            </>
          )}
        </Card.Body>
      </Card>
    </Stack>
  );
};

export default ResultSummaryPanel;
