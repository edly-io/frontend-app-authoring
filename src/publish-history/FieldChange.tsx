import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge } from '@openedx/paragon';

import type { Slot } from './BlockPair';
import { jsonDiffSlots } from './JsonDiff';
import TextDiff from './TextDiff';
import type { Age, FieldChangeData } from './types';
import messages from './messages';
import { formatValue } from './utils';

/** The field's name and scope, and why it was not diffed when it wasn't. Shown in both cards. */
const FieldName = ({ field }: { field: FieldChangeData; }) => {
  const intl = useIntl();
  return (
    <>
      <div className="d-flex align-items-center">
        <code className="mr-2 text-break">{field.name}</code>
        <Badge variant="light">
          {intl.formatMessage(field.scope === 'content' ? messages.fieldScopeContent : messages.fieldScopeSettings)}
        </Badge>
      </div>
      {field.tooLarge && (
        <p className="small text-gray-700 mt-2 mb-0">
          {intl.formatMessage(field.tooLargeReason === 'budget' ? messages.tooLargeBudget : messages.tooLargeSize)}
        </p>
      )}
    </>
  );
};

/** One side's value: red on the older side, green on the newer one, unmarked when the field was not diffed. */
const FieldValue = ({ field, side }: { field: FieldChangeData; side: Age; }) => {
  const intl = useIntl();
  const text = formatValue(side === 'older' ? field.old : field.new, intl.formatMessage(messages.fieldEmpty));
  const marked = field.tooLarge ? '' : ` publish-history-value-${side}`;
  return <pre className={`publish-history-value${marked}`}>{text}</pre>;
};

/**
 * One changed field as slots of a block's two cards: its name, then a text diff, a key-level JSON diff (one slot per
 * key, so keys line up) or the old value (red, older side) and the new value (green, newer side). A field that was not
 * diffed says why and shows its values, cut short, unmarked.
 */
export const fieldSlots = (field: FieldChangeData): Slot[] => {
  const key = `${field.scope}-${field.name}`;
  const name: Slot = {
    key: `${key}-name`,
    className: 'publish-history-field pt-3 pb-2',
    render: () => <FieldName field={field} />,
  };
  if (field.jsonDiff) {
    return [name, ...jsonDiffSlots(field.name, field.jsonDiff, key)];
  }
  const { textDiff } = field;
  return [name, {
    key: `${key}-value`,
    render: (side: Age) => (
      textDiff ? <TextDiff name={field.name} diff={textDiff} side={side} /> : <FieldValue field={field} side={side} />
    ),
  }];
};
