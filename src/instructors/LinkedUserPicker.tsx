import React from 'react';
import { debounce } from 'lodash';
import { Button, Form } from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useSearchInstructorUsers } from './data/apiHooks';
import type { UserOption } from './data/types';

const messages = defineMessages({
  fieldUser: { id: 'instructors.detail.field.user', defaultMessage: 'Linked user' },
  searchUser: { id: 'instructors.detail.field.user.search', defaultMessage: 'Search active users' },
  userAlreadyLinked: { id: 'instructors.detail.field.user.linked', defaultMessage: 'already linked' },
  clearUser: { id: 'instructors.detail.field.user.clear', defaultMessage: 'Clear linked user' },
  userName: { id: 'instructors.detail.field.user.name', defaultMessage: 'Name' },
  userEmail: { id: 'instructors.detail.field.user.email', defaultMessage: 'Email' },
});

interface LinkedUserPickerProps {
  /** The user currently linked, if any. */
  selected: {
    id: number; username: string; name: string; email?: string;
  } | null | undefined;
  /** Called with the chosen user. */
  onSelect: (user: UserOption) => void;
  /** Called when the link is cleared. */
  onClear: () => void;
  /** Error to show under the field, such as "already linked". */
  error?: string;
}

/**
 * Search active users and pick one to link to an instructor.
 *
 * Search is debounced and runs on the server. A plain input with a result list is used instead of an
 * autosuggest control, because the options arrive after the user types.
 */
const LinkedUserPicker: React.FC<LinkedUserPickerProps> = ({
  selected, onSelect, onClear, error,
}) => {
  const intl = useIntl();
  const [term, setTerm] = React.useState('');
  const [text, setText] = React.useState('');
  const { data: options = [] } = useSearchInstructorUsers(term);
  const debouncedSearch = React.useMemo(() => debounce(setTerm, 300), []);
  React.useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  return (
    <Form.Group className="mb-4" isInvalid={!!error}>
      <Form.Label>{intl.formatMessage(messages.fieldUser)}</Form.Label>
      <Form.Control
        name="userSearch"
        autoComplete="off"
        placeholder={intl.formatMessage(messages.searchUser)}
        value={text}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setText(e.target.value);
          debouncedSearch(e.target.value);
        }}
      />
      {term.trim() && text.trim() && options.length > 0 && (
        <div className="border rounded mt-1" role="listbox">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="tertiary"
              className="d-block w-100 text-left"
              role="option"
              aria-selected={selected?.id === option.id}
              onClick={() => {
                onSelect(option);
                setText('');
                setTerm('');
              }}
            >
              {`${option.name} (${option.username})`}
              {option.linked ? ` · ${intl.formatMessage(messages.userAlreadyLinked)}` : ''}
            </Button>
          ))}
        </div>
      )}
      {selected && (
        <div className="mt-3">
          <Form.Group className="mb-3">
            <Form.Label>{intl.formatMessage(messages.userName)}</Form.Label>
            <Form.Control name="userName" value={selected.name} readOnly />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>{intl.formatMessage(messages.userEmail)}</Form.Label>
            <Form.Control name="userEmail" value={selected.email ?? ''} readOnly />
          </Form.Group>
          <Button variant="link" size="sm" className="px-0" onClick={onClear}>
            {intl.formatMessage(messages.clearUser)}
          </Button>
        </div>
      )}
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

export default LinkedUserPicker;
