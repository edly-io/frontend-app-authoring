import { RATING_LEVELS } from './feedbackDashboardUtils';

const RATING_COLUMNS_PER_CRITERION = RATING_LEVELS.length;
const PRINT_SUBJECT_COLUMN_WIDTH_MM = 58;
const PRINT_RATING_COLUMN_WIDTH_MM = 14;
export const PRINT_PAGE_MARGIN_MM = 10;
const PRINT_PAGE_MIN_WIDTH_MM = 420;
const PRINT_PAGE_MIN_HEIGHT_MM = 297;
const PRINT_PAGE_MAX_WIDTH_MM = 1400;
const PRINT_PAGE_MAX_HEIGHT_MM = 1200;
const PRINT_HEADER_HEIGHT_MM = 72;
const PRINT_ROW_HEIGHT_MM = 9;
const PRINT_MIN_DENSITY = 0.56;

export interface FeedbackDashboardPrintLayout {
  pageHeight: number;
  pageWidth: number;
  styleVariables: Record<string, string | number>;
}

const clampPrintSize = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const roundPrintSize = (value: number) => Math.round(value * 10) / 10;

export const getFeedbackDashboardPrintLayout = (
  criteriaCount: number,
  subjectCount: number,
): FeedbackDashboardPrintLayout => {
  const criteriaAndAverageColumns = (criteriaCount + 1) * RATING_COLUMNS_PER_CRITERION;
  const preferredTableWidth = PRINT_SUBJECT_COLUMN_WIDTH_MM
    + (criteriaAndAverageColumns * PRINT_RATING_COLUMN_WIDTH_MM);
  const preferredContentHeight = PRINT_HEADER_HEIGHT_MM + (Math.max(subjectCount, 1) * PRINT_ROW_HEIGHT_MM);
  const maxContentWidth = PRINT_PAGE_MAX_WIDTH_MM - (PRINT_PAGE_MARGIN_MM * 2);
  const maxContentHeight = PRINT_PAGE_MAX_HEIGHT_MM - (PRINT_PAGE_MARGIN_MM * 2);
  const density = Math.max(
    PRINT_MIN_DENSITY,
    Math.min(
      1,
      maxContentWidth / preferredTableWidth,
      maxContentHeight / preferredContentHeight,
    ),
  );
  const subjectColumnWidth = roundPrintSize(Math.max(36, PRINT_SUBJECT_COLUMN_WIDTH_MM * density));
  const ratingColumnWidth = roundPrintSize(Math.max(7.8, PRINT_RATING_COLUMN_WIDTH_MM * density));
  const rowHeight = roundPrintSize(Math.max(5.6, PRINT_ROW_HEIGHT_MM * density));
  const tableWidth = subjectColumnWidth + (criteriaAndAverageColumns * ratingColumnWidth);
  const headerHeight = roundPrintSize(Math.max(48, PRINT_HEADER_HEIGHT_MM * density));
  const contentHeight = headerHeight + (Math.max(subjectCount, 1) * rowHeight);
  const pageWidth = clampPrintSize(
    tableWidth + (PRINT_PAGE_MARGIN_MM * 2),
    PRINT_PAGE_MIN_WIDTH_MM,
    PRINT_PAGE_MAX_WIDTH_MM,
  );
  const pageHeight = clampPrintSize(
    contentHeight + (PRINT_PAGE_MARGIN_MM * 2),
    PRINT_PAGE_MIN_HEIGHT_MM,
    PRINT_PAGE_MAX_HEIGHT_MM,
  );

  return {
    pageHeight,
    pageWidth,
    styleVariables: {
      '--feedback-print-density': density,
      '--feedback-print-font-size': `${roundPrintSize(Math.max(5.6, 8 * density))}pt`,
      '--feedback-print-group-font-size': `${roundPrintSize(Math.max(5.8, 7 * density))}pt`,
      '--feedback-print-header-font-size': `${roundPrintSize(Math.max(4.8, 6 * density))}pt`,
      '--feedback-print-meta-font-size': `${roundPrintSize(Math.max(5.2, 7 * density))}pt`,
      '--feedback-print-rating-column-width': `${ratingColumnWidth}mm`,
      '--feedback-print-row-height': `${rowHeight}mm`,
      '--feedback-print-subject-column-width': `${subjectColumnWidth}mm`,
    },
  };
};
