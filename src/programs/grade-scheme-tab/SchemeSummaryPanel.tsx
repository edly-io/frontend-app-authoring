import React, { useMemo } from 'react';
import {
  Alert, Card, Icon, ProgressBar, Stack,
} from '@openedx/paragon';
import { Check, CheckCircle, Warning } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';
import { getSectionVariant } from './utils';
import type { EditableSection } from './types';

const messages = defineMessages({
  balancedTitle: { id: 'programs.scheme.balanced.title', defaultMessage: 'Balanced at {total} marks.' },
  balancedSubtitle: {
    id: 'programs.scheme.balanced.subtitle',
    defaultMessage: '{count, plural, one {# section} other {# sections}} ready to publish.',
  },
  underTitle: { id: 'programs.scheme.under.title', defaultMessage: 'Under by {diff} marks.' },
  underSubtitle: { id: 'programs.scheme.under.subtitle', defaultMessage: 'Add {diff} more to balance the scheme.' },
  overTitle: { id: 'programs.scheme.over.title', defaultMessage: 'Over by {diff} marks.' },
  overSubtitle: {
    id: 'programs.scheme.over.subtitle',
    defaultMessage: 'Reduce max marks by {diff} to balance the scheme.',
  },
  emptyTitle: { id: 'programs.scheme.empty-total.title', defaultMessage: 'No sections yet.' },
  emptySubtitle: { id: 'programs.scheme.empty-total.subtitle', defaultMessage: 'Add a section to get started.' },
  schemeTotalLabel: { id: 'programs.scheme.scheme-total.label', defaultMessage: 'Scheme total' },
  balancedCaption: { id: 'programs.scheme.balanced-caption', defaultMessage: 'Balanced' },
  unbalancedCaption: { id: 'programs.scheme.unbalanced-caption', defaultMessage: 'Unbalanced' },
});

interface SchemeSummaryPanelProps {
  sections: EditableSection[];
  sectionTotals: number[];
  targetTotal: number;
  grandTotal: number;
  isBalanced: boolean;
}

interface StatusContent {
  icon: React.ComponentType;
  variant: 'success' | 'warning' | 'danger' | 'info';
  title: MessageDescriptor;
  subtitle: MessageDescriptor;
  values: Record<string, number>;
}

const SchemeSummaryPanel: React.FC<SchemeSummaryPanelProps> = ({
  sections, sectionTotals, targetTotal, grandTotal, isBalanced,
}) => {
  const intl = useIntl();
  const balanceDifference = targetTotal - grandTotal;
  const chartScale = Math.max(targetTotal, grandTotal, 1);

  const statusContent = useMemo<StatusContent>(() => {
    let content: StatusContent;
    if (sections.length === 0) {
      content = {
        icon: Warning,
        variant: 'info',
        title: messages.emptyTitle,
        subtitle: messages.emptySubtitle,
        values: {},
      };
    } else if (isBalanced) {
      content = {
        icon: CheckCircle,
        variant: 'success',
        title: messages.balancedTitle,
        subtitle: messages.balancedSubtitle,
        values: { total: grandTotal, count: sections.length },
      };
    } else if (balanceDifference > 0) {
      content = {
        icon: Warning,
        variant: 'warning',
        title: messages.underTitle,
        subtitle: messages.underSubtitle,
        values: { diff: balanceDifference },
      };
    } else {
      content = {
        icon: Warning,
        variant: 'danger',
        title: messages.overTitle,
        subtitle: messages.overSubtitle,
        values: { diff: Math.abs(balanceDifference) },
      };
    }
    return content;
  }, [sections.length, isBalanced, balanceDifference, grandTotal]);

  return (
    <Stack gap={3} className="sticky-top">
      <Alert variant={statusContent.variant} className="mb-0">
        <div className="d-flex align-items-start gap-2">
          <Icon src={statusContent.icon} className="mr-2" />
          <div className="line-height-20">
            <strong>{intl.formatMessage(statusContent.title, statusContent.values)}</strong>
            {' '}
            {intl.formatMessage(statusContent.subtitle, statusContent.values)}
          </div>
        </div>
      </Alert>

      <Card className="p-3">
        <Card.Body>
          <span className="text-uppercase small text-muted fw-bold">
            {intl.formatMessage(messages.schemeTotalLabel)}
          </span>
          <div className="d-flex align-items-baseline gap-1 mt-1 justify-content-center">
            <span className="h2 mb-0 fw-bold text-primary">{grandTotal}</span>
            <span className="text-muted">/ {targetTotal}</span>
          </div>
          <p className={`small mb-3 d-flex align-items-center gap-1 justify-content-center font-weight-bold ${isBalanced ? 'text-success-800' : 'text-warning-800'}`}>
            <Icon src={isBalanced ? Check : Warning} />
            {intl.formatMessage(isBalanced ? messages.balancedCaption : messages.unbalancedCaption)}
          </p>

          {sections.length > 0 && (
            <>
              <ProgressBar className="mb-3 border-0 rounded-lg">
                {sections.map((section, index) => (
                  <ProgressBar
                    key={section.localId}
                    now={(sectionTotals[index] / chartScale) * 100}
                    className={`bg-${getSectionVariant(index)}-800`}
                  />
                ))}
              </ProgressBar>

              <Stack>
                {sections.map((section, index) => (
                  <div key={section.localId} className="d-flex align-items-center justify-content-between small border-bottom">
                    <span className="d-flex align-items-center gap-2 text-truncate pr-3">
                      <span
                        aria-hidden="true"
                        className={`bg-${getSectionVariant(index)}-800 rounded-sm flex-shrink-0 mr-2`}
                        style={{ width: 10, height: 10 }}
                      />
                      <span className="text-truncate small">{section.title}</span>
                    </span>
                    <span className="font-weight-bold flex-shrink-0">{sectionTotals[index]}</span>
                  </div>
                ))}
              </Stack>
            </>
          )}
        </Card.Body>
      </Card>
    </Stack>
  );
};

export default SchemeSummaryPanel;
