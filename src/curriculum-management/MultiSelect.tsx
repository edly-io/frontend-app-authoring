import type { ComponentType, KeyboardEvent } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import Select from 'react-select';

import messages from './messages';

export interface MultiSelectOption {
  value: string;
  label: string;
}

/** The react-select props this component uses. */
interface PlainSelectProps {
  inputId: string;
  isMulti: true;
  isDisabled: boolean;
  options: MultiSelectOption[];
  value: MultiSelectOption[];
  onChange: (picked: readonly MultiSelectOption[]) => void;
  placeholder: string;
  noOptionsMessage: () => string;
  closeMenuOnSelect: boolean;
  isClearable: boolean;
  menuPlacement: 'auto';
  className: string;
  classNamePrefix: string;
}

// The content tags drawer augments react-select's Props with its own required fields (a global augmentation,
// see ContentTagsCollapsible.d.ts), which would otherwise be demanded here too.
const PlainSelect = Select as unknown as ComponentType<PlainSelectProps>;

interface MultiSelectProps {
  /** Id of the search input, for the `<Form.Label htmlFor>` that names the control. */
  inputId: string;
  options: MultiSelectOption[];
  /** The selected values, in the order they were picked. */
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}

/**
 * A searchable multi-select: type to filter, pick as many options as needed, each shown as a removable chip.
 * Course groups and learning paths can run into the hundreds, so a checkbox list doesn't scale. Built on
 * react-select, which the app already uses for content tags; styled to sit next to Paragon inputs.
 */
const MultiSelect = ({
  inputId,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: MultiSelectProps) => {
  const intl = useIntl();
  // Keep the picked order (react-select hands the selection back in that order), not the options' order.
  const selected = value
    .map((item) => options.find((option) => option.value === item))
    .filter((option): option is MultiSelectOption => option !== undefined);
  // react-select handles Enter only when an option is focused; otherwise (no match, menu closed) the key would
  // reach the form and submit it. Its own handler runs first, so a selection still happens.
  const stopEnterSubmit = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onKeyDown={stopEnterSubmit}>
      <PlainSelect
        inputId={inputId}
        isMulti
        isDisabled={disabled}
        options={options}
        value={selected}
        onChange={(picked) => onChange(picked.map((option) => option.value))}
        placeholder={placeholder}
        noOptionsMessage={() => intl.formatMessage(messages.noMatches)}
        closeMenuOnSelect={false}
        isClearable={false}
        menuPlacement="auto"
        className="curriculum-management-multiselect"
        classNamePrefix="curriculum-management-multiselect"
      />
    </div>
  );
};

export default MultiSelect;
