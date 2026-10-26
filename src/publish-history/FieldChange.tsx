import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Col, Row } from '@openedx/paragon';

import JsonDiff from './JsonDiff';
import TextDiff from './TextDiff';
import type { Age, FieldChangeData } from './types';
import messages from './messages';
import { formatValue } from './utils';

interface FieldChangeProps {
  field: FieldChangeData;
  /** The left and the right column. */
  columns: [Age, Age];
}

/**
 * One changed field in two columns: a text diff, a key-level JSON diff, or the old value (red, older side) and the
 * new value (green, newer side). A field that was not diffed says why and shows its values, cut short, unmarked.
 */
const FieldChange = ({ field, columns }: FieldChangeProps) => {
  const intl = useIntl();
  const empty = intl.formatMessage(messages.fieldEmpty);
  const value = (side: Age) => {
    const text = formatValue(side === 'older' ? field.old : field.new, empty);
    if (field.tooLarge) {
      return <pre className="publish-history-value">{text}</pre>;
    }
    return <pre className={`publish-history-value publish-history-value-${side}`}>{text}</pre>;
  };

  let body;
  if (field.jsonDiff) {
    body = <JsonDiff name={field.name} diff={field.jsonDiff} columns={columns} />;
  } else {
    body = (
      <Row>
        {columns.map((side) => (
          <Col xs={6} key={side}>
            {field.textDiff ? <TextDiff name={field.name} diff={field.textDiff} side={side} /> : value(side)}
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <div className="publish-history-field pt-3">
      <div className="d-flex align-items-center mb-2">
        <code className="mr-2 text-break">{field.name}</code>
        <Badge variant="light">
          {intl.formatMessage(field.scope === 'content' ? messages.fieldScopeContent : messages.fieldScopeSettings)}
        </Badge>
      </div>
      {field.tooLarge && (
        <p className="small text-gray-700 mb-2">
          {intl.formatMessage(field.tooLargeReason === 'budget' ? messages.tooLargeBudget : messages.tooLargeSize)}
        </p>
      )}
      {body}
    </div>
  );
};

export default FieldChange;
