import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form, Icon, IconButton } from '@openedx/paragon';
import { Add, Remove } from '@openedx/paragon/icons';
import messages from './messages';

export type ThresholdValue = number | '';

interface ThresholdControlProps {
  value: ThresholdValue;
  onChange: (value: ThresholdValue) => void;
  id?: string;
  min?: number;
  disabled?: boolean;
}

/** Leave-threshold number field with − / + steppers, built on Paragon's Form.Control decorators. */
const ThresholdControl = ({
  value, onChange, id = 'leave-threshold', min = 0, disabled = false,
}: ThresholdControlProps) => {
  const intl = useIntl();
  const numeric = value === '' ? min : value;
  const step = (delta: number) => onChange(Math.max(min, numeric + delta));

  return (
    <Form.Group controlId={id} className="mb-0">
      <Form.Label>{intl.formatMessage(messages.thresholdLabel)}</Form.Label>
      <Form.Control
        type="number"
        min={min}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        // className lands on Paragon's decorator wrapper, controlClassName on the <input>.
        className="requests-threshold"
        controlClassName="requests-threshold__input text-center"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        leadingElement={(
          <IconButton
            src={Remove}
            iconAs={Icon}
            alt={intl.formatMessage(messages.thresholdDecrease)}
            size="sm"
            variant="primary"
            onClick={() => step(-1)}
            // Paragon's IconButton types omit `disabled`, though the button forwards it.
            {...{ disabled: disabled || numeric <= min }}
          />
        )}
        trailingElement={(
          <IconButton
            src={Add}
            iconAs={Icon}
            alt={intl.formatMessage(messages.thresholdIncrease)}
            size="sm"
            variant="primary"
            onClick={() => step(1)}
            {...{ disabled }}
          />
        )}
      />
      <Form.Control.Feedback type="default">
        {intl.formatMessage(messages.leaveThresholdHelp)}
      </Form.Control.Feedback>
    </Form.Group>
  );
};

export default ThresholdControl;
