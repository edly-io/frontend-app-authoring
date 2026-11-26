import { defineMessages } from '@edx/frontend-platform/i18n';

const p = 'course-authoring.course-tags';

const messages = defineMessages({
  button: { id: `${p}.button`, defaultMessage: 'Tags', description: 'Course outline header button that opens the course tags dialog.' },
  buttonTooltip: { id: `${p}.button.tooltip`, defaultMessage: 'Add tags to this course', description: 'Tooltip of the course outline Tags button.' },
  modalTitle: { id: `${p}.modal.title`, defaultMessage: 'Course tags', description: 'Title of the course tags dialog.' },
  close: { id: `${p}.modal.close`, defaultMessage: 'Close', description: 'Button that closes the course tags dialog.' },
  loading: { id: `${p}.loading`, defaultMessage: 'Loading tags', description: 'Screen reader text of the spinner shown while the course\'s tags load.' },
  loadError: { id: `${p}.load-error`, defaultMessage: 'Tags could not be loaded. Close this dialog and try again.', description: 'Error shown when the course\'s tags fail to load.' },
  searchLabel: { id: `${p}.search.label`, defaultMessage: 'Add a tag', description: 'Label of the field for finding or creating a tag to add to the course.' },
  searchPlaceholder: { id: `${p}.search.placeholder`, defaultMessage: 'Type a tag, e.g. road safety', description: 'Placeholder of the tag search field.' },
  searchResults: { id: `${p}.search.results`, defaultMessage: 'Tag suggestions', description: 'Accessible name of the dropdown list of tags matching the text typed.' },
  searchResultCount: { id: `${p}.search.result-count`, defaultMessage: '{count, plural, =0 {No matching tags} one {# matching tag} other {# matching tags}}', description: 'Screen reader announcement of how many existing tags match the text typed.' },
  noMatches: { id: `${p}.search.no-matches`, defaultMessage: 'No matching tags.', description: 'Shown in the tag dropdown when nothing can be picked.' },
  suggestionsError: { id: `${p}.search.error`, defaultMessage: 'Suggestions could not be loaded.', description: 'Shown in the tag dropdown when the matching tags fail to load; a new tag can still be created.' },
  create: { id: `${p}.search.create`, defaultMessage: 'Create "{name}"', description: 'Last option of the tag dropdown: creates a tag with the text typed and adds it to the course.' },
  counter: { id: `${p}.counter`, defaultMessage: '{count}/{max}', description: 'How many tags the course has, out of the most it may have (for example 3/100).' },
  counterAria: { id: `${p}.counter.aria`, defaultMessage: '{count} of {max} tags used', description: 'Accessible text of the tag counter.' },
  limitReached: { id: `${p}.limit-reached`, defaultMessage: '{max, plural, one {This course has the maximum of # tag. Remove one to add another.} other {This course has the maximum of # tags. Remove one to add another.}}', description: 'Hint under the disabled tag field when the course has as many tags as allowed.' },
  assignedLabel: { id: `${p}.assigned.label`, defaultMessage: 'Tags of this course', description: 'Accessible name of the list of tags added to the course.' },
  empty: { id: `${p}.assigned.empty`, defaultMessage: 'This course has no tags yet.', description: 'Shown instead of the tag chips when the course has no tags.' },
  removeAria: { id: `${p}.assigned.remove-aria`, defaultMessage: 'Remove {name}', description: 'Accessible name of the cross button on a tag chip, which removes the tag from the course.' },
  assignError: { id: `${p}.assign-error`, defaultMessage: 'The tag could not be added. Try again.', description: 'Error shown when adding a tag fails for an unexpected reason.' },
  unassignError: { id: `${p}.unassign-error`, defaultMessage: 'The tag could not be removed. Try again.', description: 'Error shown when removing a tag fails.' },
  permissionError: { id: `${p}.permission-error`, defaultMessage: 'You don\'t have permission to make this change.', description: 'Error shown when the server refuses a change (403).' },
  nameBlank: { id: `${p}.name-error.blank`, defaultMessage: 'Enter a tag name.', description: 'Error shown when the tag typed is empty.' },
  nameTooLong: { id: `${p}.name-error.too-long`, defaultMessage: '{max, plural, one {Use at most # character.} other {Use at most # characters.}}', description: 'Error shown when the tag typed is longer than the maximum (max is the number of characters allowed).' },
  tooManyTags: { id: `${p}.error.too-many-tags`, defaultMessage: '{max, plural, one {A course can have at most # tag. Remove one first.} other {A course can have at most # tags. Remove one first.}}', description: 'Error shown when adding a tag to a course that already has the maximum number of tags.' },
});

export default messages;
