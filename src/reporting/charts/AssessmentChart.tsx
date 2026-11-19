import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';

import type { AssessmentSummary } from '../data/api';
import messages from '../messages';

// Below this the dimension line is a few pixels tall and reads as a smudge, not a measurement.
const MIN_VISIBLE_GAIN = 3;

const CHART = {
  width: 720,
  height: 300,
  padTop: 44,
  padBottom: 44,
  padLeft: 44,
  padRight: 150,
  barWidth: 104,
  radius: 8,
};

/**
 * The platform-wide before-and-after: two columns on one 0-100% scale, with the gain measured between them.
 *
 * This panel is the only place the comparison figures appear. Its caption carries the scope (how many
 * courses, how many learners), so nothing else on the page has to restate the same numbers.
 *
 * Deliberately the aggregate and not a column per course: the table below already breaks it down, and the
 * point of this panel is the single comparison the whole tab is about. Columns from a common baseline
 * because that is the encoding people read most accurately; a pie would be wrong (before and after are not
 * parts of a whole) and a line would imply a trend through two points that have no order between them.
 *
 * The gain is drawn as a dimension line bracketing the two column tops rather than printed as a third
 * number, so the figure measures something visible instead of asserting it.
 */
const AssessmentChart = ({ summary, scopeMessage }: {
  summary: AssessmentSummary;
  scopeMessage: MessageDescriptor;
}) => {
  const intl = useIntl();
  const { avgPrePct, avgPostPct } = summary;
  const before = intl.formatMessage(messages.chartBefore);
  const after = intl.formatMessage(messages.chartAfter);

  if (avgPrePct === null || avgPostPct === null) {
    return <div className="reporting-empty">{intl.formatMessage(messages.chartNoData)}</div>;
  }

  const {
    width,
    height,
    padTop,
    padBottom,
    padLeft,
    padRight,
    barWidth,
    radius,
  } = CHART;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;
  const y = (value: number) => baseline - (Math.max(0, Math.min(100, value)) / 100) * plotHeight;
  const plotRight = width - padRight;
  const plotWidth = plotRight - padLeft;
  const centres = [padLeft + plotWidth * 0.3, padLeft + plotWidth * 0.72];
  const pct = (value: number) => `${intl.formatNumber(value, { maximumFractionDigits: 1 })}%`;

  // The backend sends the gain, but deriving it as a fallback keeps the annotation when only that field
  // is missing: both averages are present by here, so the difference is always knowable.
  const gainPct = summary.gainPct ?? avgPostPct - avgPrePct;

  const column = (value: number, centre: number, label: string, series: 'pre' | 'post') => {
    const top = y(value);
    // The radius has to stay inside the bar or a near-zero value draws as a lozenge off the axis.
    const barHeight = Math.max(baseline - top, 1);
    return (
      <g>
        <rect
          className={`reporting-chart__bar reporting-chart__bar--${series}`}
          x={centre - barWidth / 2}
          y={top}
          width={barWidth}
          height={barHeight}
          rx={Math.min(radius, barWidth / 2, barHeight / 2)}
        />
        <text className="reporting-chart__value" x={centre} y={top - 14} textAnchor="middle">
          {pct(value)}
        </text>
        <text className="reporting-chart__label" x={centre} y={baseline + 26} textAnchor="middle">
          {label}
        </text>
      </g>
    );
  };

  // A dimension line in the right margin: it measures the span between the two tops, so the gain figure
  // is attached to a length on the page rather than floating free.
  const rule = plotRight + 26;
  const delta = Math.abs(gainPct) < MIN_VISIBLE_GAIN ? null : (
    <g className="reporting-chart__delta">
      <line
        className="reporting-chart__delta-lead"
        x1={centres[1] + barWidth / 2}
        x2={rule}
        y1={y(avgPostPct)}
        y2={y(avgPostPct)}
      />
      <line
        className="reporting-chart__delta-lead"
        x1={centres[0] + barWidth / 2}
        x2={rule}
        y1={y(avgPrePct)}
        y2={y(avgPrePct)}
      />
      <line
        className="reporting-chart__delta-rule"
        x1={rule}
        x2={rule}
        y1={y(avgPostPct)}
        y2={y(avgPrePct)}
      />
      <line className="reporting-chart__delta-cap" x1={rule - 5} x2={rule + 5} y1={y(avgPostPct)} y2={y(avgPostPct)} />
      <line className="reporting-chart__delta-cap" x1={rule - 5} x2={rule + 5} y1={y(avgPrePct)} y2={y(avgPrePct)} />
      <text
        className={`reporting-chart__delta-value reporting-chart__delta-value--${gainPct < 0 ? 'down' : 'up'}`}
        x={rule + 14}
        y={(y(avgPrePct) + y(avgPostPct)) / 2}
        dominantBaseline="middle"
      >
        {intl.formatNumber(gainPct, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
        <tspan className="reporting-chart__delta-unit" dx="3">
          {intl.formatMessage(messages.gainUnit)}
        </tspan>
      </text>
      <text className="reporting-chart__delta-label" x={rule + 14} y={(y(avgPrePct) + y(avgPostPct)) / 2 + 20}>
        {intl.formatMessage(messages.gainLabel)}
      </text>
    </g>
  );

  return (
    <figure className="reporting-chart">
      {/* Real DOM text, not SVG: it stays legible at phone width instead of shrinking with the viewBox. */}
      <figcaption className="reporting-chart__scope">
        {intl.formatMessage(scopeMessage, { counted: summary.counted, learners: summary.learners })}
      </figcaption>
      <svg
        className="reporting-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={intl.formatMessage(messages.chartAlt, {
          before: pct(avgPrePct),
          after: pct(avgPostPct),
        })}
      >
        {[0, 25, 50, 75, 100].map(tick => (
          <g key={tick}>
            <line
              className={tick === 0 ? 'reporting-chart__baseline' : 'reporting-chart__grid'}
              x1={padLeft}
              x2={plotRight}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="reporting-chart__tick" x={padLeft - 10} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {column(avgPrePct, centres[0], before, 'pre')}
        {column(avgPostPct, centres[1], after, 'post')}
        {delta}
      </svg>
    </figure>
  );
};

export default AssessmentChart;
