import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  rowAction: {
    id: 'programs.row-action.label',
    defaultMessage: '{action} {name}',
    description: 'Accessible name for a button in a list row: the visible action followed by the item it acts on, e.g. "Remove Introduction to CS".',
  },
});

export default messages;
