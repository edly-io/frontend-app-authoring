import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  calendarAltText: {
    id: 'fbr-admin.datepicker-control.calendar-alt-text',
    defaultMessage: 'Calendar for datepicker input',
    description: 'Alt text for the decorative calendar icon shown inside a date input.',
  },
  previousMonthAriaLabel: {
    id: 'fbr-admin.datepicker-control.previous-month-aria-label',
    defaultMessage: 'Previous month',
    description: 'Accessible label for the calendar navigation control that moves to the previous month.',
  },
  nextMonthAriaLabel: {
    id: 'fbr-admin.datepicker-control.next-month-aria-label',
    defaultMessage: 'Next month',
    description: 'Accessible label for the calendar navigation control that moves to the next month.',
  },
  previousYearAriaLabel: {
    id: 'fbr-admin.datepicker-control.previous-year-aria-label',
    defaultMessage: 'Previous year',
    description: 'Accessible label for the calendar navigation control that moves to the previous year.',
  },
  nextYearAriaLabel: {
    id: 'fbr-admin.datepicker-control.next-year-aria-label',
    defaultMessage: 'Next year',
    description: 'Accessible label for the calendar navigation control that moves to the next year.',
  },
  monthAriaLabelPrefix: {
    id: 'fbr-admin.datepicker-control.month-aria-label-prefix',
    defaultMessage: 'month',
    description: 'Prefix read out before the month name by screen readers, e.g. "month: September".',
  },
  chooseDayAriaLabelPrefix: {
    id: 'fbr-admin.datepicker-control.choose-day-aria-label-prefix',
    defaultMessage: 'Choose',
    description: 'Prefix read out before a selectable day, e.g. "Choose Tuesday, September 1st, 2026".',
  },
  disabledDayAriaLabelPrefix: {
    id: 'fbr-admin.datepicker-control.disabled-day-aria-label-prefix',
    defaultMessage: 'Not available',
    description: 'Prefix read out before a day that is outside the allowed min/max range.',
  },
});

export default messages;
