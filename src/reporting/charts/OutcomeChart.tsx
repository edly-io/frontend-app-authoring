import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';

import type { AssessmentOutcome } from '../data/api';
import messages from '../messages';

const OUTCOME = {
  width: 420,
  height: 300,
  padTop: 44,
  padBottom: 44,
  padLeft: 44,
  padRight: 24,
  barWidth: 86,
  radius: 8,
};

/**
 * How the Final check actually went: how many learners cleared it and how many did not.
 *
 * This is the half of the picture ``KnowledgeCheckResult`` cannot see -- it stores a Final check only
 * once it is passed -- so the counts come from the learners' block state. Without it a reader has no way
 * to tell a course where everyone passed from one where most of the cohort is still failing, because
 * both show the same before-and-after.
 *
 * Counts, not percentages, because the question here is "how many people" and a share would hide a
 * two-learner course behind the same bar as a two-hundred-learner one. The scale is the attempt count,
 * so the two bars always add up to the whole.
 */
const OutcomeChart = ({
  outcome,
  scopeMessage,
  emptyMessage,
  altMessage,
  passedLabel = messages.outcomePassed,
  failedLabel = messages.outcomeFailed,
}: {
  outcome: AssessmentOutcome;
  scopeMessage: MessageDescriptor;
  emptyMessage: MessageDescriptor;
  altMessage: MessageDescriptor;
  passedLabel?: MessageDescriptor;
  failedLabel?: MessageDescriptor;
}) => {
  const intl = useIntl();
  const { attempted, passed, failed } = outcome;

  if (!attempted) {
    return <div className="reporting-empty">{intl.formatMessage(emptyMessage)}</div>;
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
  } = OUTCOME;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;
  const y = (value: number) => baseline - (value / attempted) * plotHeight;
  const plotRight = width - padRight;
  const centres = [padLeft + (plotRight - padLeft) * 0.3, padLeft + (plotRight - padLeft) * 0.7];
  // Ticks at whole learners only: half a person is not a reading anyone needs.
  const step = Math.max(1, Math.ceil(attempted / 4));
  const ticks: number[] = [];
  for (let tick = 0; tick <= attempted; tick += step) { ticks.push(tick); }

  const column = (value: number, centre: number, label: string, series: 'passed' | 'failed') => {
    const top = y(value);
    const barHeight = Math.max(baseline - top, 1);
    return (
      <g>
        <rect
          className={`reporting-outcome__bar reporting-outcome__bar--${series}`}
          x={centre - barWidth / 2}
          y={top}
          width={barWidth}
          height={barHeight}
          rx={Math.min(radius, barWidth / 2, barHeight / 2)}
        />
        <text className="reporting-chart__value" x={centre} y={top - 14} textAnchor="middle">
          {intl.formatNumber(value)}
        </text>
        <text className="reporting-chart__label" x={centre} y={baseline + 26} textAnchor="middle">
          {label}
        </text>
      </g>
    );
  };

  return (
    <figure className="reporting-chart">
      <figcaption className="reporting-chart__scope">
        {intl.formatMessage(scopeMessage, { attempted })}
      </figcaption>
      <svg
        className="reporting-chart__svg reporting-chart__svg--outcome"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={intl.formatMessage(altMessage, { passed, failed })}
      >
        {ticks.map(tick => (
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
        {column(passed, centres[0], intl.formatMessage(passedLabel), 'passed')}
        {column(failed, centres[1], intl.formatMessage(failedLabel), 'failed')}
      </svg>
    </figure>
  );
};

export default OutcomeChart;
