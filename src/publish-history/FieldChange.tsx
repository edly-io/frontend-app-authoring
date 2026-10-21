import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge } from '@openedx/paragon';

import TextDiff from './TextDiff';
import type { FieldChangeData } from './types';
import messages from './messages';

/** A value as text: strings as they are, anything else as JSON. React escapes it, so it is never markup. */
const showValue = (value: unknown, empty: string) => {
  if (value === null || value === undefined || value === '') {
    return empty;
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const FieldChange = ({ field }: { field: FieldChangeData; }) => {
  const intl = useIntl();
  const empty = intl.formatMessage(messages.fieldEmpty);
  return (
    <div className="mt-2">
      <div className="d-flex align-items-center">
        <strong className="mr-2 text-break">{field.name}</strong>
        <Badge variant="light">
          {intl.formatMessage(field.scope === 'content' ? messages.fieldScopeContent : messages.fieldScopeSettings)}
        </Badge>
      </div>
      {field.textDiff && <TextDiff name={field.name} diff={field.textDiff} />}
      {field.tooLarge && <p className="small text-gray-700 mb-1">{intl.formatMessage(messages.tooLarge)}</p>}
      {/* Values are null when the text was too large to diff; cut values are shown as far as they go. */}
      {!field.textDiff && (!field.tooLarge || field.old !== null || field.new !== null) && (
        <dl className="mb-0">
          <dt className="small text-gray-700">{intl.formatMessage(messages.fieldOld)}</dt>
          <dd>
            <pre className="publish-history-value">{showValue(field.old, empty)}</pre>
          </dd>
          <dt className="small text-gray-700">{intl.formatMessage(messages.fieldNew)}</dt>
          <dd>
            <pre className="publish-history-value">{showValue(field.new, empty)}</pre>
          </dd>
        </dl>
      )}
    </div>
  );
};

export default FieldChange;
