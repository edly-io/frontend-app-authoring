import { useId } from 'react';
import type { ReactNode } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Card } from '@openedx/paragon';

import type { Age, DiffSide } from './types';
import messages from './messages';
import { formatTime, shortId, userName } from './utils';

/** What a side is: a past published version, the live version or the draft. */
export const useKindName = () => {
  const intl = useIntl();
  return (side: DiffSide) => {
    if (side.kind === 'draft') {
      return intl.formatMessage(messages.optionDraft);
    }
    return intl.formatMessage(side.kind === 'published' ? messages.optionPublished : messages.kindVersion);
  };
};

/** Older or Newer, red or green like the changes in that column. */
export const AgeBadge = ({ age }: { age: Age; }) => {
  const intl = useIntl();
  return (
    <Badge variant={age === 'older' ? 'danger' : 'success'}>
      {intl.formatMessage(age === 'older' ? messages.ageOlder : messages.ageNewer)}
    </Badge>
  );
};

/** One line about a side: kind, then when and by whom, and its short id. */
export const SideSummary = ({ side }: { side: DiffSide; }) => {
  const intl = useIntl();
  const kindName = useKindName();
  return (
    <>
      <div className="font-weight-bold">{kindName(side)}</div>
      <div className="small text-gray-700">
        {intl.formatMessage(messages.sideMeta, { date: formatTime(intl, side.at), user: userName(intl, side.by) })}
        <code className="ml-2" title={side.id}>{shortId(side.id)}</code>
      </div>
    </>
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
          {side && <SideSummary side={side} />}
          {children}
        </Card.Section>
      </Card>
    </section>
  );
};

export default VersionCard;
