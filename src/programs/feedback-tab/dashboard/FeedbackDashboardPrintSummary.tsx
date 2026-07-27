import React from 'react';
import { createPortal } from 'react-dom';
import type {
  DashboardAggregationMode,
  FeedbackDashboardReport,
  FeedbackDashboardSubject,
  FeedbackDashboardSummary,
} from './types';
import FeedbackDashboardTable from './FeedbackDashboardTable';
import {
  formatPercent,
  RATING_LEVELS,
} from './feedbackDashboardUtils';
import {
  getFeedbackDashboardPrintLayout,
  PRINT_PAGE_MARGIN_MM,
} from './feedbackDashboardPrintLayout';
import './feedback-dashboard-print.scss';

interface FeedbackDashboardPrintSummaryProps {
  report: FeedbackDashboardReport;
  summary: FeedbackDashboardSummary;
  subjects: FeedbackDashboardSubject[];
  aggregationMode: DashboardAggregationMode;
}

const FeedbackDashboardPrintSummary: React.FC<FeedbackDashboardPrintSummaryProps> = ({
  report,
  summary,
  subjects,
  aggregationMode,
}) => {
  const printedAt = React.useMemo(
    () => new Date().toLocaleString(),
    [],
  );
  const { pageHeight, pageWidth, styleVariables } = React.useMemo(
    () => getFeedbackDashboardPrintLayout(report.criteria.length, subjects.length),
    [report.criteria.length, subjects.length],
  );
  const aggregationLabel = aggregationMode === 'count' ? 'Number' : 'Percent';
  const printStyle = styleVariables as React.CSSProperties;

  const printSummary = (
    <>
      <style media="print">
        {`@page { size: ${pageWidth}mm ${pageHeight}mm; margin: ${PRINT_PAGE_MARGIN_MM}mm; }`}
      </style>
      <section
        className="feedback-dashboard-print-summary"
        aria-label="Printable feedback summary"
        style={printStyle}
      >
        <header className="feedback-dashboard-print-header">
          <div>
            <p className="feedback-dashboard-print-kicker">Feedback Summary</p>
            <h1>{report.feedbackName}</h1>
            <p>{report.programName}</p>
          </div>
          <div className="feedback-dashboard-print-meta">
            <div>
              <span>Respondents</span>
              <strong>{report.respondentsLabel}</strong>
            </div>
            <div>
              <span>Response rate</span>
              <strong>{formatPercent(summary.responseRate)}</strong>
            </div>
            <div>
              <span>Aggregation</span>
              <strong>{aggregationLabel}</strong>
            </div>
            <div>
              <span>Printed</span>
              <strong>{printedAt}</strong>
            </div>
          </div>
        </header>

        <div className="feedback-dashboard-print-legend">
          {RATING_LEVELS.map((level) => (
            <span key={level.key} className={`feedback-dashboard-legend-item feedback-dashboard-legend-${level.key}`}>
              <span aria-hidden="true" />
              {level.shortLabel}
            </span>
          ))}
        </div>

        {subjects.length === 0 ? (
          <p className="feedback-dashboard-print-empty">No people match the current filters.</p>
        ) : (
          <FeedbackDashboardTable
            report={report}
            subjects={subjects}
            aggregationMode={aggregationMode}
            enableUserHoverCard={false}
          />
        )}
      </section>
    </>
  );

  if (typeof document === 'undefined') {
    return printSummary;
  }

  return createPortal(printSummary, document.body);
};

export default FeedbackDashboardPrintSummary;
