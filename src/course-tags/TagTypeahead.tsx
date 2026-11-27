import {
  useEffect,
  useMemo,
  useRef,
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
const HINT_ID = 'course-tags-hint';
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

/** One pickable row of the dropdown: an existing tag, or "Create" with the text typed. */
type Option = { kind: 'tag'; name: string; key: string; } | { kind: 'create'; name: string; key: string; };

interface TagTypeaheadProps {
  courseId: string;
  /** The course's tags: never offered, and an exact match among them hides "Create". */
  assigned: Tag[];
  /** Disables the field and hides the list; give a `hint` that says why. */
  disabled: boolean;
  /** Shown under the field; when the field becomes disabled while focused, focus moves here. */
  hint?: string;
  /**
   * Called with the name to assign: an existing tag's name, or the normalised text typed. Call `onAssigned` once
   * the tag is assigned, which clears the field. Return false to ignore the pick (e.g. a change is still saving).
   */
  onPick: (name: string, onAssigned: () => void) => boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

/** Normalised, lower case and without accents, for a substring match. */
const foldForMatch = (text: string) =>
  normalizeTagName(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

/**
 * Whether `name` contains `text` the way the API matches suggestions (`name__icontains`): ignoring case and, as
 * MySQL's default collation does, accents. Erring wide only lets a near match through, never an unrelated tag.
 */
const containsText = (name: string, text: string) => foldForMatch(name).includes(foldForMatch(text));

/**
 * A combobox for adding tags: as the author types, existing tags containing the text are suggested (debounced),
 * and a last "Create" option adds the text as a new tag unless a tag with that name already exists. Arrow keys
 * move through the options; Enter picks the active option, or with none active the tag named exactly as typed
 * (or Create when it is the only option); Escape closes the list. Picking closes the list and keeps focus in the field,
 * which is cleared once the tag is assigned (a failed assign keeps the text, to fix or retry).
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
  // The active option by key, not by index: results that arrive between an arrow key and Enter move the options,
  // and Enter must still pick the option that was highlighted (or none when it is gone).
  const [activeKey, setActiveKey] = useState<string>();
  // Created once; don't recreate per keystroke.
  const debouncedSetTerm = useMemo(() => debounce(setTerm, SUGGESTION_DEBOUNCE_MS), []);
  useEffect(() => () => debouncedSetTerm.cancel(), [debouncedSetTerm]);

  // Reaching the limit disables the field the author just picked from, which drops focus to <body>; move it to
  // the hint that explains why instead. Not on mount: a dialog opened at the limit keeps its usual focus.
  const wasDisabled = useRef(disabled);
  useEffect(() => {
    const focused = document.activeElement;
    if (disabled && !wasDisabled.current && (focused === inputRef.current || focused === document.body)) {
      // After React finishes this commit: the blur it fires updates Form.Control's own state, which would otherwise
      // re-render it in the middle of these effects (React warns about that under act in tests).
      queueMicrotask(() => document.getElementById(HINT_ID)?.focus());
    }
    wasDisabled.current = disabled;
  }, [disabled]);

  const { data: suggestions = [], isFetching, isError } = useTagSuggestions(courseId, term);
  const typed = normalizeTagName(input);
  const assignedIds = new Set(assigned.map(({ id }) => id));
  // The server already leaves out the course's tags; this also drops one assigned since the last fetch. While the
  // next term is debounced or loading, the previous term's results are still shown (`keepPreviousData`): keep
  // only those that match the text typed now, so a stale tag is never shown or picked.
  const tagOptions: Option[] = typed ?
    suggestions
      .filter(({ id, name }) => !assignedIds.has(id) && containsText(name, typed))
      .map(({ id, name }) => ({ kind: 'tag', name, key: `tag-${id}` })) :
    [];
  const exists = [...tagOptions, ...assigned].some(({ name }) => isSameTagName(name, typed));
  const options: Option[] = typed && !exists ?
    [...tagOptions, { kind: 'create', name: typed, key: 'create' }] :
    tagOptions;
  const showList = isOpen && !!typed && !disabled;
  const active = showList ? options.findIndex(({ key }) => key === activeKey) : -1;

  // Announced only once the results are for the text typed now.
  const announcement = showList && term === typed && !isFetching && !isError ?
    intl.formatMessage(messages.searchResultCount, { count: tagOptions.length }) :
    '';

  const pick = (option: Option) => {
    const pickedFrom = input;
    const accepted = onPick(option.name, () => {
      // Unless the author has typed something else meanwhile.
      if (inputRef.current?.value === pickedFrom) {
        debouncedSetTerm.cancel();
        setInput('');
        setTerm('');
      }
    });
    if (!accepted) {
      return;
    }
    setIsOpen(false);
    setActiveKey(undefined);
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
        setActiveKey(options[(from + step + options.length) % options.length].key);
        break;
      }
      case 'Enter': {
        event.preventDefault();
        if (!showList) {
          return;
        }
        const exactMatch = options.find(({ kind, name }) => kind === 'tag' && isSameTagName(name, typed));
        if (active >= 0) {
          pick(options[active]);
        } else if (exactMatch) {
          pick(exactMatch);
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
          setActiveKey(undefined);
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
        aria-describedby={hint ? HINT_ID : undefined}
        value={input}
        maxLength={TAG_NAME_MAX_LENGTH}
        disabled={disabled}
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setInput(event.target.value);
          setIsOpen(true);
          setActiveKey(undefined);
          debouncedSetTerm(normalizeTagName(event.target.value));
        }}
        onKeyDown={handleKeyDown}
      />
      {/* Focusable from script only, so focus can land here when the field gets disabled. */}
      {hint && <Form.Text id={HINT_ID} tabIndex={-1}>{hint}</Form.Text>}
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
        {/* Not with the error (nothing is known to match or not), nor before the results for this text are in. */}
        {showList && !isError && options.length === 0 && term === typed && !isFetching && (
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
