import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { debounce } from 'lodash';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form, Icon } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import { useTagSuggestions } from './data/apiHooks';
import messages from './messages';
import type { Tag } from './types';
import { TAG_NAME_MAX_LENGTH, isSameTagName, normalizeTagName } from './utils';

export const SUGGESTION_DEBOUNCE_MS = 300;

const INPUT_ID = 'course-tags-search';
const LISTBOX_ID = 'course-tags-suggestions';
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

/** One pickable row of the dropdown: an existing tag, or "Create" with the text typed. */
type Option = { kind: 'tag'; name: string; key: string; } | { kind: 'create'; name: string; key: string; };

interface TagTypeaheadProps {
  courseId: string;
  /** The course's tags: never offered, and an exact match among them hides "Create". */
  assigned: Tag[];
  /** The course is at its tag limit: the field is disabled and `hint` explains why. */
  disabled: boolean;
  hint?: string;
  /** Called with the name to assign: an existing tag's name, or the normalised text typed. */
  onPick: (name: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

/**
 * A combobox for adding tags: as the author types, existing tags containing the text are suggested (debounced),
 * and a last "Create" option adds the text as a new tag unless a tag with that name already exists. Arrow keys
 * move through the options, Enter picks, Escape closes the list; picking clears the field and keeps focus in it.
 */
const TagTypeahead = ({
  courseId,
  assigned,
  disabled,
  hint,
  onPick,
  inputRef,
}: TagTypeaheadProps) => {
  const intl = useIntl();
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Created once; don't recreate per keystroke.
  const debouncedSetTerm = useMemo(() => debounce(setTerm, SUGGESTION_DEBOUNCE_MS), []);
  useEffect(() => () => debouncedSetTerm.cancel(), [debouncedSetTerm]);

  const { data: suggestions = [], isFetching, isError } = useTagSuggestions(courseId, term);
  const typed = normalizeTagName(input);
  const assignedIds = new Set(assigned.map(({ id }) => id));
  // The server already leaves out the course's tags; this also drops one assigned since the last fetch.
  const tagOptions: Option[] = typed ?
    suggestions
      .filter(({ id }) => !assignedIds.has(id))
      .map(({ id, name }) => ({ kind: 'tag', name, key: `tag-${id}` })) :
    [];
  const exists = [...tagOptions, ...assigned].some(({ name }) => isSameTagName(name, typed));
  const options: Option[] = typed && !exists ?
    [...tagOptions, { kind: 'create', name: typed, key: 'create' }] :
    tagOptions;
  const showList = isOpen && !!typed && !disabled;
  const active = showList && activeIndex >= 0 && activeIndex < options.length ? activeIndex : -1;

  const announcement = showList && term && !isFetching && !isError ?
    intl.formatMessage(messages.searchResultCount, { count: tagOptions.length }) :
    '';

  const pick = (option: Option) => {
    debouncedSetTerm.cancel();
    setInput('');
    setTerm('');
    setActiveIndex(-1);
    onPick(option.name);
    // The picked option disappears with the list; keep focus in the field so the author can add another.
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!typed || options.length === 0) {
          return;
        }
        event.preventDefault();
        setIsOpen(true);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const from = active === -1 && step === -1 ? 0 : active;
        setActiveIndex((from + step + options.length) % options.length);
        break;
      }
      case 'Enter': {
        event.preventDefault();
        if (!showList) {
          return;
        }
        if (active >= 0) {
          pick(options[active]);
        } else if (options.length === 1 && options[0].kind === 'create') {
          pick(options[0]);
        }
        break;
      }
      case 'Escape':
        if (showList) {
          // Close the list only; the dialog itself closes on the next Escape.
          event.stopPropagation();
          setIsOpen(false);
          setActiveIndex(-1);
        }
        break;
      default:
    }
  };

  return (
    <Form.Group controlId={INPUT_ID} className="mb-3">
      <Form.Label>{intl.formatMessage(messages.searchLabel)}</Form.Label>
      <Form.Control
        ref={inputRef}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        value={input}
        maxLength={TAG_NAME_MAX_LENGTH}
        disabled={disabled}
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setInput(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
          debouncedSetTerm(normalizeTagName(event.target.value));
        }}
        onKeyDown={handleKeyDown}
      />
      {hint && <Form.Text>{hint}</Form.Text>}
      {/* Always mounted, so screen readers pick up changes to its text. */}
      <div role="status" className="sr-only">{announcement}</div>
      {/* Always mounted, so the input's aria-controls always points at an element. */}
      <ul
        id={LISTBOX_ID}
        role="listbox"
        aria-label={intl.formatMessage(messages.searchResults)}
        className={showList
          ? 'course-tags-suggestions list-unstyled w-100 border rounded bg-white mt-1 mb-0'
          : 'd-none'}
      >
        {showList && isError && (
          <li role="presentation" className="px-3 py-2 small text-danger">
            {intl.formatMessage(messages.suggestionsError)}
          </li>
        )}
        {showList && options.length === 0 && !isFetching && (
          <li role="presentation" className="px-3 py-2 small text-gray-700">
            {intl.formatMessage(messages.noMatches)}
          </li>
        )}
        {showList && options.map((option, index) => (
          // Keyboard use goes through the combobox input (aria-activedescendant), as the ARIA combobox pattern
          // prescribes; options are clickable only.
          <li
            key={option.key}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={`course-tags-option d-flex align-items-center px-3 py-2${index === active ? ' active' : ''}`}
            title={option.name}
            // Keep focus in the input, so the click doesn't blur it first.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(option)}
          >
            {option.kind === 'create' ?
              (
                <>
                  <Icon src={Add} size="xs" className="mr-2 flex-shrink-0" />
                  <span className="text-truncate">{intl.formatMessage(messages.create, { name: option.name })}</span>
                </>
              ) :
              <span className="text-truncate">{option.name}</span>}
          </li>
        ))}
      </ul>
    </Form.Group>
  );
};

export default TagTypeahead;
