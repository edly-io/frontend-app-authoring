import React from 'react';
import {
  render, fireEvent, screen, waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import DatepickerControl, { DATEPICKER_DISPLAY_FORMAT } from './DatepickerControl';
import messages from './messages';

describe('<DatepickerControl />', () => {
  const onChangeMock = jest.fn();
  const RootWrapper = (props) => (
    <IntlProvider locale="en">
      <DatepickerControl {...props} />
    </IntlProvider>
  );

  const props = {
    label: 'fooLabel',
    value: '',
    helpText: 'barHelpText',
    isInvalid: false,
    controlName: 'fooControlName',
    onChange: onChangeMock,
  };

  // Flushes the component's lazy locale-load effect so it stays inside `act`.
  const flushLocaleLoad = () => waitFor(() => {});

  afterEach(() => {
    onChangeMock.mockClear();
  });

  it('renders without crashing, with the label, help text, and the DD/MM/YYYY placeholder', async () => {
    const { getByText, getByPlaceholderText } = render(<RootWrapper {...props} />);
    await flushLocaleLoad();
    expect(getByText(props.label)).toBeInTheDocument();
    expect(getByText(props.helpText)).toBeInTheDocument();
    expect(getByPlaceholderText(DATEPICKER_DISPLAY_FORMAT.toUpperCase())).toBeInTheDocument();
  });

  it('parses a stored yyyy-MM-dd value and displays it as dd/MM/yyyy', async () => {
    render(<RootWrapper {...props} value="2026-09-15" />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    expect(input.value).toBe('15/09/2026');
  });

  it('calls onChange with a plain yyyy-MM-dd string on date selection', async () => {
    render(<RootWrapper {...props} />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    fireEvent.change(input, { target: { value: '16/09/2026' } });
    expect(onChangeMock).toHaveBeenCalledWith('2026-09-16');
  });

  it('supports clearing the value back to an empty string', async () => {
    render(<RootWrapper {...props} value="2026-09-15" />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    fireEvent.change(input, { target: { value: '' } });
    expect(onChangeMock).toHaveBeenCalledWith('');
  });

  it('associates the visible label with the input for screen readers', async () => {
    render(<RootWrapper {...props} id="my-date-field" />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    expect(input).toHaveAttribute('id', 'my-date-field');
  });

  it('marks an invalid, required field with aria-invalid/aria-required and describes it via the help text', async () => {
    render(<RootWrapper {...props} isInvalid required />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input.getAttribute('aria-describedby')).toEqual(
      expect.stringContaining('-help-text'),
    );
  });

  it('marks the field disabled when readonly', async () => {
    render(<RootWrapper {...props} readonly />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    expect(input).toBeDisabled();
  });

  it('exposes translated labels for the calendar navigation controls', async () => {
    render(<RootWrapper {...props} />);
    await flushLocaleLoad();
    // The calendar (and its nav controls) only mounts once the input opens it.
    fireEvent.focus(screen.getByLabelText(props.label));
    expect(
      screen.getByLabelText(messages.previousMonthAriaLabel.defaultMessage),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(messages.nextMonthAriaLabel.defaultMessage),
    ).toBeInTheDocument();
  });

  it('exposes exactly one keyboard tab-stop in the open calendar grid (roving tabindex)', async () => {
    render(<RootWrapper {...props} value="2026-09-15" />);
    await flushLocaleLoad();
    fireEvent.focus(screen.getByLabelText(props.label));
    const days = [...document.querySelectorAll('.react-datepicker__day:not(.react-datepicker__day--outside-month)')];
    const tabbable = days.filter((day) => day.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent('15');
    expect(tabbable[0]).toHaveClass('react-datepicker__day--selected');
  });

  it('selects a day (mouse/click activation of a focusable day cell) and reports it via onChange', async () => {
    render(<RootWrapper {...props} value="2026-09-15" />);
    await flushLocaleLoad();
    fireEvent.focus(screen.getByLabelText(props.label));
    const day20 = screen.getAllByText('20', { selector: '.react-datepicker__day' })
      .find((day) => !day.className.includes('outside-month'));
    fireEvent.click(day20);
    expect(onChangeMock).toHaveBeenCalledWith('2026-09-20');
  });

  it('disables calendar days before minDate', async () => {
    render(<RootWrapper {...props} value="2026-09-15" minDate="2026-09-10" />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    fireEvent.focus(input);
    const disabledDay = await screen.findByText(
      '1',
      { selector: '.react-datepicker__day--disabled' },
    );
    expect(disabledDay).toBeInTheDocument();
  });

  it('disables calendar days after maxDate', async () => {
    render(<RootWrapper {...props} value="2026-09-15" maxDate="2026-09-20" />);
    await flushLocaleLoad();
    const input = screen.getByLabelText(props.label);
    fireEvent.focus(input);
    const disabledDay = await screen.findByText(
      '25',
      { selector: '.react-datepicker__day--disabled' },
    );
    expect(disabledDay).toBeInTheDocument();
  });

  describe('renderGroup=false (bare mode, for composing into a caller-owned form layout)', () => {
    it('renders only the icon+input, without its own Form.Group, label, or help text', async () => {
      const { container, queryByText } = render(
        <RootWrapper {...props} renderGroup={false} />,
      );
      await flushLocaleLoad();
      expect(queryByText(props.label)).not.toBeInTheDocument();
      expect(queryByText(props.helpText)).not.toBeInTheDocument();
      expect(container.querySelector('.datepicker-custom-control')).toBeInTheDocument();
    });

    it('carries an ariaLabel through to the input when there is no visible label', async () => {
      render(<RootWrapper {...props} renderGroup={false} label={undefined} ariaLabel="From" />);
      await flushLocaleLoad();
      expect(screen.getByLabelText('From')).toBeInTheDocument();
    });

    it('still carries data-testid through to the input', async () => {
      render(
        <RootWrapper {...props} renderGroup={false} dataTestId="startDate" />,
      );
      await flushLocaleLoad();
      expect(screen.getByTestId('startDate')).toBeInTheDocument();
    });
  });
});
