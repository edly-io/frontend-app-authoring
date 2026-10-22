import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Form } from '@openedx/paragon';
import { DatepickerControl } from '@edly-io/frontend-component-fbr';
import messages from './messages';

interface DateRangeFilterProps {
  idPrefix: string;
  label: string;
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

/** A labelled From / To date pair with a Clear button once either is set. */
const DateRangeFilter = ({
  idPrefix, label, from, to, onChange,
}: DateRangeFilterProps) => {
  const intl = useIntl();
  const fromId = `${idPrefix}-date-from`;
  const toId = `${idPrefix}-date-to`;
  return (
    <>
      <span className="requests-filters__label">{label}</span>
      <div className="requests-filters__dates">
        <div className="requests-filters__date-field">
          <Form.Label htmlFor={fromId} className="requests-filters__date-label">{intl.formatMessage(messages.from)}</Form.Label>
          <DatepickerControl id={fromId} value={from} onChange={(value) => onChange({ from: value, to })} className="requests-filters__date" />
        </div>
        <div className="requests-filters__date-field">
          <Form.Label htmlFor={toId} className="requests-filters__date-label">{intl.formatMessage(messages.to)}</Form.Label>
          <DatepickerControl
            id={toId}
            value={to}
            minDate={from}
            onChange={(value) => onChange({ from, to: value })}
            className="requests-filters__date"
          />
        </div>
        {(from || to) && (
          <Button variant="tertiary" size="sm" onClick={() => onChange({ from: '', to: '' })}>
            {intl.formatMessage(messages.clear)}
          </Button>
        )}
      </div>
    </>
  );
};

export default DateRangeFilter;
