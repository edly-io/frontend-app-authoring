import type { ReactNode } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { Age } from './types';
import messages from './messages';

/**
 * One line of a block's comparison, shown in both cards at the same height: a field's name, its value, one JSON
 * entry. `render` gives that line for one side.
 */
export interface Slot {
  key: string;
  render: (side: Age) => ReactNode;
  className?: string;
}

interface BlockPairProps {
  /** The left and the right column. */
  columns: [Age, Age];
  slots: Slot[];
  /** The top line of each card, for example which side it is. */
  header?: (side: Age) => ReactNode;
  /** The side the block is not in (added or removed): a muted placeholder replaces its card. */
  absent?: Age | null;
  /** The accessible name of each card. */
  label: (side: Age) => string;
}

/**
 * One block as two separate cards in two equal columns, left then right. From the md breakpoint up, each card is
 * a subgrid of the same rows, so a slot lines up with its counterpart; below it the cards stack, left first.
 */
const BlockPair = ({
  columns,
  slots,
  header,
  absent = null,
  label,
}: BlockPairProps) => {
  const intl = useIntl();
  const rows = Math.max(slots.length + (header ? 1 : 0), 1);
  return (
    <div className="publish-history-pair">
      {columns.map((side, index) => {
        const style = { gridRow: `1 / span ${rows}`, gridColumn: index + 1 };
        if (side === absent) {
          return (
            <div
              key={side}
              role="group"
              aria-label={label(side)}
              className="publish-history-card publish-history-card-absent d-flex align-items-center justify-content-center p-3 small text-gray-700"
              style={style}
            >
              {intl.formatMessage(messages.blockNotInVersion)}
            </div>
          );
        }
        return (
          <div key={side} role="group" aria-label={label(side)} className="publish-history-card" style={style}>
            {header && <div className="publish-history-card-header px-3 py-2">{header(side)}</div>}
            {slots.map((slot) => (
              <div key={slot.key} className={`publish-history-slot px-3 ${slot.className ?? ''}`}>
                {slot.render(side)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default BlockPair;
