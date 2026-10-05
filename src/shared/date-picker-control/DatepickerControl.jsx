import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { format, parse, isValid as isValidDateFns } from 'date-fns';
import { Form, Icon } from '@openedx/paragon';
import { Calendar } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import { getDateFnsLocale } from './dateFnsLocale';
import messages from './messages';

export const DATEPICKER_VALUE_FORMAT = 'yyyy-MM-dd';
export const DATEPICKER_DISPLAY_FORMAT = 'dd/MM/yyyy';

const isValidJsDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

const parseValue = (value, valueFormat) => {
  if (!value) {
    return null;
  }
  const parsed = parse(value, valueFormat, new Date());
  return isValidDateFns(parsed) ? parsed : null;
};

const formatValue = (date, valueFormat) => {
  if (!isValidJsDate(date)) {
    return '';
  }
  return format(date, valueFormat);
};

const DatepickerControl = ({
  label,
  ariaLabel,
  value,
  onChange,
  id,
  controlName,
  valueFormat,
  displayFormat,
  minDate,
  maxDate,
  isInvalid,
  helpText,
  readonly,
  required,
  dataTestId,
  onBlur,
  onFocus,
  renderGroup,
  formGroupClassName,
  className,
}) => {
  const intl = useIntl();
  // Lazily-loaded date-fns locale for react-datepicker's `locale` prop; skipped for English.
  const [locale, setLocale] = useState(undefined);
  const isEnglish = intl.locale?.toLowerCase().startsWith('en');

  useEffect(() => {
    if (isEnglish) {
      return undefined;
    }
    let isMounted = true;
    getDateFnsLocale(intl.locale).then((loadedLocale) => {
      if (isMounted) {
        setLocale(loadedLocale);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [intl.locale, isEnglish]);

  const inputId = id || controlName;
  const helpTextId = helpText ? `${inputId}-help-text` : undefined;

  const selectedDate = parseValue(value, valueFormat);
  const minSelectableDate = parseValue(minDate, valueFormat);
  const maxSelectableDate = parseValue(maxDate, valueFormat);

  // Carried through via `customInput` - react-datepicker doesn't forward arbitrary props
  // (like `data-testid` or `aria-label`) to its own rendered <input>.
  const extraInputProps = {};
  if (dataTestId) {
    extraInputProps['data-testid'] = dataTestId;
  }
  if (ariaLabel) {
    extraInputProps['aria-label'] = ariaLabel;
  }
  const customInput = Object.keys(extraInputProps).length > 0 ? <input {...extraInputProps} /> : undefined;

  const datepickerNode = (
    <div className="position-relative">
      {!readonly && (
        <Icon
          src={Calendar}
          className="datepicker-custom-control-icon"
          alt={intl.formatMessage(messages.calendarAltText)}
        />
      )}
      <DatePicker
        id={inputId}
        name={controlName}
        selected={selectedDate}
        disabled={readonly}
        dateFormat={displayFormat}
        className={classNames('form-control datepicker-custom-control', className, {
          'is-invalid': isInvalid,
        })}
        autoComplete="off"
        placeholderText={displayFormat.toUpperCase()}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        // Fixed positioning lets the calendar escape overflow containers such as modals.
        popperProps={{ strategy: 'fixed' }}
        minDate={minSelectableDate}
        maxDate={maxSelectableDate}
        locale={locale}
        required={required}
        ariaInvalid={isInvalid || undefined}
        ariaRequired={required || undefined}
        ariaDescribedBy={helpTextId}
        customInput={customInput}
        previousMonthAriaLabel={intl.formatMessage(messages.previousMonthAriaLabel)}
        nextMonthAriaLabel={intl.formatMessage(messages.nextMonthAriaLabel)}
        previousYearAriaLabel={intl.formatMessage(messages.previousYearAriaLabel)}
        nextYearAriaLabel={intl.formatMessage(messages.nextYearAriaLabel)}
        monthAriaLabelPrefix={intl.formatMessage(messages.monthAriaLabelPrefix)}
        chooseDayAriaLabelPrefix={intl.formatMessage(messages.chooseDayAriaLabelPrefix)}
        disabledDayAriaLabelPrefix={intl.formatMessage(messages.disabledDayAriaLabelPrefix)}
        onBlur={onBlur}
        onFocus={onFocus}
        onChange={(date) => {
          if (isValidJsDate(date)) {
            onChange(formatValue(date, valueFormat));
          } else if (date === null) {
            onChange('');
          }
        }}
        // react-datepicker's own `onChange` silently drops a fully-typed date outside
        // minDate/maxDate. Parsing the raw text here restores the native
        // <input type="date"> contract: any fully-formed typed date reaches `onChange`
        // regardless of min/max, and the caller's own bounds-checking (e.g. clamping an
        // end date up to the start date) decides what to do with it.
        onChangeRaw={(event) => {
          const rawValue = event.target.value;
          if (rawValue === '') {
            onChange('');
            return;
          }
          const parsed = parse(rawValue, displayFormat, new Date());
          if (isValidDateFns(parsed) && format(parsed, displayFormat) === rawValue) {
            onChange(formatValue(parsed, valueFormat));
          }
        }}
      />
    </div>
  );

  if (!renderGroup) {
    return datepickerNode;
  }

  return (
    <Form.Group
      controlId={inputId}
      className={classNames('datepicker-custom-group', formGroupClassName)}
    >
      <Form.Label htmlFor={inputId}>{label}</Form.Label>
      {datepickerNode}
      {helpText && <Form.Control.Feedback id={helpTextId}>{helpText}</Form.Control.Feedback>}
    </Form.Group>
  );
};

DatepickerControl.defaultProps = {
  label: '',
  ariaLabel: '',
  value: '',
  id: '',
  controlName: '',
  valueFormat: DATEPICKER_VALUE_FORMAT,
  displayFormat: DATEPICKER_DISPLAY_FORMAT,
  minDate: '',
  maxDate: '',
  isInvalid: false,
  helpText: '',
  readonly: false,
  required: false,
  dataTestId: undefined,
  onBlur: undefined,
  onFocus: undefined,
  renderGroup: true,
  formGroupClassName: '',
  className: '',
};

DatepickerControl.propTypes = {
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  id: PropTypes.string,
  controlName: PropTypes.string,
  valueFormat: PropTypes.string,
  displayFormat: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  isInvalid: PropTypes.bool,
  helpText: PropTypes.string,
  readonly: PropTypes.bool,
  required: PropTypes.bool,
  dataTestId: PropTypes.string,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  renderGroup: PropTypes.bool,
  formGroupClassName: PropTypes.string,
  className: PropTypes.string,
};

export default DatepickerControl;
