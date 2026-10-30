import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';

import messages from '../messages';

interface LaunchFieldsProps {
  scheme: string;
  maxTtlSeconds: number;
}

/**
 * The fields of a launch string, in signing order, and what each one means. Reference only, so it sits in the
 * help sidebar as a compact list; the saved links' own values are on their cards.
 */
const LaunchFields = ({ scheme, maxTtlSeconds }: LaunchFieldsProps) => {
  const intl = useIntl();
  const rows: [string, MessageDescriptor, Record<string, number>?][] = [
    ['external_id', messages.fieldExternalIdNotes],
    ['target', messages.fieldTargetNotes],
    ['course_id', messages.fieldCourseIdNotes],
    ['path_id', messages.fieldPathIdNotes],
    ['groups', messages.fieldGroupsNotes],
    ['expires', messages.fieldExpiresNotes, { max: maxTtlSeconds }],
    ['nonce', messages.fieldNonceNotes],
    ['sig', messages.fieldSigNotes],
  ];
  return (
    <div className="curriculum-management-launch-fields" data-testid="launch-fields">
      <h4 className="help-sidebar-about-title">{intl.formatMessage(messages.launchFieldsHeading)}</h4>
      <p className="help-sidebar-about-descriptions">
        {intl.formatMessage(messages.launchFieldsHelp, { scheme })}
      </p>
      <dl className="mb-4">
        {rows.map(([name, notes, values]) => (
          <div key={name} className="curriculum-management-launch-field">
            <dt>
              <code>{name}</code>
            </dt>
            <dd>
              <span className="d-block x-small text-gray-700">{intl.formatMessage(notes, values)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default LaunchFields;
