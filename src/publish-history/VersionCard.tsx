import { useId } from 'react';
import type { ClipboardEvent, ReactNode } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Card } from '@openedx/paragon';

import type { Age, DiffSide } from './types';
import messages from './messages';
import { formatTime, shortId, userName } from './utils';

/** Older or Newer, red or green like the changes in that column. */
export const AgeBadge = ({ age }: { age: Age; }) => {
  const intl = useIntl();
  return (
    <Badge variant={age === 'older' ? 'danger' : 'success'}>
      {intl.formatMessage(age === 'older' ? messages.ageOlder : messages.ageNewer)}
    </Badge>
  );
};

/**
 * A version's short id, with the full id as its tooltip. Copying the short id (or part of it) copies the full id.
 */
export const VersionId = ({ id }: { id: string; }) => {
  const short = shortId(id);
  const copyFullId = (event: ClipboardEvent) => {
    const selected = window.getSelection()?.toString().trim();
    if (selected && short.includes(selected)) {
      event.clipboardData.setData('text/plain', id);
      event.preventDefault();
    }
  };
  return <code title={id} onCopy={copyFullId}>{short}</code>;
};

/**
 * One line about a side: when, by whom (bold) and its short id, with a badge when it is the live version or the
 * draft.
 */
export const SideLine = ({ side }: { side: DiffSide; }) => {
  const intl = useIntl();
  let kind: string | null = null;
  if (side.kind === 'published') {
    kind = intl.formatMessage(messages.currentBadge);
  } else if (side.kind === 'draft') {
    kind = intl.formatMessage(messages.optionDraft);
  }
  return (
    <span className="publish-history-side-line">
      {intl.formatMessage(messages.sideLine, {
        date: formatTime(intl, side.at),
        user: <strong key="user">{userName(intl, side.by)}</strong>,
        id: <VersionId key="id" id={side.id} />,
      })}
      {kind && <Badge variant="success" className="ml-2">{kind}</Badge>}
    </span>
  );
};

interface VersionCardProps {
  heading: string;
  /** Known once the comparison has loaded. */
  age: Age | null;
  side: DiffSide | null;
  children?: ReactNode;
}

/**
 * The head of one comparison column, a region named by its heading: which version it holds and whether it is the
 * older or the newer one.
 */
const VersionCard = ({
  heading,
  age,
  side,
  children,
}: VersionCardProps) => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="h-100">
      <Card className="h-100">
        <Card.Section>
          <div className="d-flex align-items-center mb-2">
            <h3 id={headingId} className="h5 mb-0 mr-2">{heading}</h3>
            {age && <AgeBadge age={age} />}
          </div>
          {side && (
            <div className="small text-gray-700">
              <SideLine side={side} />
            </div>
          )}
          {children}
        </Card.Section>
      </Card>
    </section>
  );
};

export default VersionCard;
