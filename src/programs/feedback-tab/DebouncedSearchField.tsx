import React from 'react';
import { SearchField } from '@openedx/paragon';

interface DebouncedSearchFieldProps {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  debounceMs?: number;
}

const DebouncedSearchField: React.FC<DebouncedSearchFieldProps> = ({
  value,
  onSearch,
  placeholder,
  label,
  className,
  debounceMs = 350,
}) => {
  const [inputValue, setInputValue] = React.useState(value);
  const timeoutRef = React.useRef<number | null>(null);

  const clearPendingSearch = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    setInputValue(value);
    clearPendingSearch();
  }, [clearPendingSearch, value]);

  React.useEffect(() => () => clearPendingSearch(), [clearPendingSearch]);

  const commitSearch = React.useCallback(
    (nextValue: string) => {
      clearPendingSearch();
      onSearch(nextValue);
    },
    [clearPendingSearch, onSearch],
  );

  const handleChange = React.useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      clearPendingSearch();
      timeoutRef.current = window.setTimeout(() => {
        onSearch(nextValue);
        timeoutRef.current = null;
      }, debounceMs);
    },
    [clearPendingSearch, debounceMs, onSearch],
  );

  const handleClear = React.useCallback(() => {
    setInputValue('');
    commitSearch('');
  }, [commitSearch]);

  const handleSubmit = React.useCallback(
    (submittedValue: string) => {
      setInputValue(submittedValue);
      commitSearch(submittedValue);
    },
    [commitSearch],
  );

  return (
    <SearchField
      value={inputValue}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onClear={handleClear}
      placeholder={placeholder}
      label={label}
      className={className}
    />
  );
};

export default DebouncedSearchField;
