import { useIntl } from '@edx/frontend-platform/i18n';

import type { Age, TextDiffData } from './types';
import messages from './messages';

interface TextDiffProps {
  name: string;
  diff: TextDiffData;
  /** The column: the older side shows unchanged and removed text, the newer side unchanged and added text. */
  side: Age;
}

/**
 * One side of a word or line diff. The text is authored HTML, so it is rendered as plain text children only: never
 * as markup. Removed and added runs are `<del>` and `<ins>` (struck through and underlined, with screen reader
 * text), so colour is not the only cue.
 */
const TextDiff = ({ name, diff, side }: TextDiffProps) => {
  const intl = useIntl();
  const age = intl.formatMessage(side === 'older' ? messages.ageOlderText : messages.ageNewerText);
  const hidden = side === 'older' ? 'insert' : 'delete';
  return (
    <div
      className="publish-history-text"
      role="group"
      aria-label={intl.formatMessage(messages.textDiffLabel, { name, age })}
    >
      {diff.segments.map(({ op, text }, index) => {
        // Segments are never reordered, so the position is a stable key.
        const key = `${op}-${index}`;
        if (op === hidden) {
          return null;
        }
        if (op === 'insert') {
          return (
            <ins key={key}>
              <span className="sr-only">{intl.formatMessage(messages.inserted)}</span>
              {text}
            </ins>
          );
        }
        if (op === 'delete') {
          return (
            <del key={key}>
              <span className="sr-only">{intl.formatMessage(messages.deleted)}</span>
              {text}
            </del>
          );
        }
        return <span key={key}>{text}</span>;
      })}
    </div>
  );
};

export default TextDiff;
