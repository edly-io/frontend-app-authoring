import { useIntl } from '@edx/frontend-platform/i18n';

import type { TextDiffData } from './types';
import messages from './messages';

interface TextDiffProps {
  name: string;
  diff: TextDiffData;
}

/**
 * A word or line diff. The text is authored HTML, so it is rendered as plain text children only: never as markup.
 * Inserted and deleted runs are `<ins>` and `<del>`, with screen reader text since colour alone says nothing.
 */
const TextDiff = ({ name, diff }: TextDiffProps) => {
  const intl = useIntl();
  return (
    <div
      className="publish-history-text"
      role="group"
      aria-label={intl.formatMessage(messages.textDiffLabel, { name })}
    >
      {diff.segments.map(({ op, text }, index) => {
        // Segments are never reordered, so the position is a stable key.
        const key = `${op}-${index}`;
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
