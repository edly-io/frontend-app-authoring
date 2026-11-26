import { act } from 'react';
import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import { apiUrls } from './data/api';
import CourseTagsModal from './CourseTagsModal';
import { SUGGESTION_DEBOUNCE_MS } from './TagTypeahead';
import {
  AIRPORT,
  COURSE_ID,
  NIGHT,
  ROAD,
  ROAD_SIGNS,
  manyTags,
  mockCourseTags,
  mockSuggestions,
  requestsOf,
} from './testHelpers';

let axiosMock;
const onClose = jest.fn();

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const renderModal = async (assigned = [] as { id: number; name: string; }[]) => {
  mockCourseTags(axiosMock, assigned);
  const view = render(<CourseTagsModal courseId={COURSE_ID} onClose={onClose} />);
  await screen.findByRole('combobox', { name: 'Add a tag' });
  return view;
};

const input = () => screen.getByRole('combobox', { name: 'Add a tag' });
const suggestionRequests = () => axiosMock.history.get.filter(({ url }) => url.includes('tag-suggestions'));

/** Let the debounce elapse and the suggestions request settle. */
const settle = async () => {
  await act(async () => {
    jest.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);
  });
  await waitFor(() => expect(axiosMock.history.get.length).toBeGreaterThan(0));
};

describe('<CourseTagsModal />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    ({ axiosMock } = initializeMocks());
    onClose.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('loading and the assigned tags', () => {
    it('shows a spinner while the tags load', async () => {
      axiosMock.onGet(apiUrls.courseTags(COURSE_ID)).reply(() => new Promise(() => {}));
      render(<CourseTagsModal courseId={COURSE_ID} onClose={onClose} />);
      expect(await screen.findByText('Loading tags')).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows an error and no field when the tags fail to load', async () => {
      axiosMock.onGet(apiUrls.courseTags(COURSE_ID)).reply(500);
      render(<CourseTagsModal courseId={COURSE_ID} onClose={onClose} />);
      expect(await screen.findByText(/Tags could not be loaded/, undefined, { timeout: 20000 })).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows the empty state and 0/100', async () => {
      await renderModal();
      expect(screen.getByText('This course has no tags yet.')).toBeInTheDocument();
      expect(screen.getByText('0 of 100 tags used').parentElement).toHaveTextContent('0/100');
      expect(screen.queryByRole('list', { name: 'Tags of this course' })).not.toBeInTheDocument();
    });

    it('lists the course tags as chips, by the order the server gave', async () => {
      await renderModal([NIGHT, ROAD]);
      const list = screen.getByRole('list', { name: 'Tags of this course' });
      expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        NIGHT.name,
        ROAD.name,
      ]);
      expect(screen.getByText('2 of 100 tags used').parentElement).toHaveTextContent('2/100');
    });

    it('has a labelled dialog', async () => {
      await renderModal();
      expect(screen.getByRole('dialog', { name: 'Course tags' })).toBeInTheDocument();
    });
  });

  describe('typeahead', () => {
    it('sends one request after typing stops', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', []);
      await user().type(input(), 'road');
      expect(suggestionRequests()).toHaveLength(0);
      await act(async () => {
        jest.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS - 1);
      });
      expect(suggestionRequests()).toHaveLength(0);
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      await waitFor(() => expect(suggestionRequests()).toHaveLength(1));
      expect(suggestionRequests()[0].url).toBe(apiUrls.suggestions(COURSE_ID, 'road'));
    });

    it('sends no request for blank text', async () => {
      await renderModal();
      await user().type(input(), '   ');
      await act(async () => {
        jest.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS * 2);
      });
      expect(suggestionRequests()).toHaveLength(0);
      expect(input()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('sends the normalised text as the search term', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road safety', []);
      await user().type(input(), '  road    safety ');
      await settle();
      await waitFor(() => expect(suggestionRequests()).toHaveLength(1));
      expect(suggestionRequests()[0].url).toBe(apiUrls.suggestions(COURSE_ID, 'road safety'));
    });

    it('lists the suggestions and a Create option when there is no exact match', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD, ROAD_SIGNS]);
      await user().type(input(), 'road');
      await settle();
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual([ROAD.name, ROAD_SIGNS.name, 'Create "road"']);
    });

    it('drops suggestions that do not contain the typed text', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD, NIGHT]);
      await user().type(input(), 'road');
      await settle();
      await screen.findByRole('option', { name: ROAD.name });
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([ROAD.name, 'Create "road"']);
    });

    it('keeps suggestions that contain the text ignoring case and accents, as the server matches', async () => {
      await renderModal();
      const cafe = { id: 6, name: 'Café Rules' };
      mockSuggestions(axiosMock, 'cafe rules', [cafe]);
      await user().type(input(), 'cafe rules');
      await settle();
      expect(await screen.findByRole('option', { name: cafe.name })).toBeInTheDocument();
    });

    it('never shows or assigns the previous search\'s tags while the next search loads', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD, ROAD_SIGNS]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).replyOnce(201, ROAD);
      const u = user();
      await u.type(input(), 'road');
      await settle();
      await u.click(await screen.findByRole('option', { name: ROAD.name }));
      await screen.findByRole('list', { name: 'Tags of this course' });
      // The next search never answers, so only the previous results could be on screen.
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'zq')).reply(() => new Promise(() => {}));
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).replyOnce(201, { id: 9, name: 'zq' });
      await u.type(input(), 'zq');
      const optionNames = () => screen.getAllByRole('option').map((option) => option.textContent);
      expect(optionNames()).toEqual(['Create "zq"']); // during the debounce
      await act(async () => {
        jest.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);
      });
      await waitFor(() =>
        expect(suggestionRequests().map(({ url }) => url))
          .toContain(apiUrls.suggestions(COURSE_ID, 'zq'))
      );
      expect(optionNames()).toEqual(['Create "zq"']); // while the request is pending
      expect(screen.queryByText(ROAD_SIGNS.name)).not.toBeInTheDocument();
      await u.keyboard('{ArrowDown}{Enter}');
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: ROAD.name }],
          [apiUrls.courseTags(COURSE_ID), { name: 'zq' }],
        ])
      );
    });

    it('offers no Create option when an exact match (any case or spacing) is suggested', async () => {
      await renderModal();
      mockSuggestions(axiosMock, '  ROAD   safety', [ROAD]);
      mockSuggestions(axiosMock, 'ROAD safety', [ROAD]);
      await user().type(input(), '  ROAD   safety');
      await settle();
      expect(await screen.findByRole('option', { name: ROAD.name })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    });

    it('offers no Create option when the exact match is already assigned', async () => {
      await renderModal([ROAD]);
      mockSuggestions(axiosMock, 'ROAD SAFETY', []);
      await user().type(input(), 'ROAD SAFETY');
      await settle();
      await screen.findByText('No matching tags.');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('does not offer a suggestion that is already assigned', async () => {
      await renderModal([ROAD]);
      mockSuggestions(axiosMock, 'road', [ROAD, ROAD_SIGNS]);
      await user().type(input(), 'road');
      await settle();
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual([ROAD_SIGNS.name, 'Create "road"']);
    });

    it('renders markup in tag names as text, in suggestions, Create and chips', async () => {
      const markup = { id: 9, name: '<img src=x onerror=alert(1)>' };
      const { container } = await renderModal([markup]);
      mockSuggestions(axiosMock, '<b>', [{ id: 10, name: '<b>bold</b>' }]);
      await user().type(input(), '<b>');
      await settle();
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual(['<b>bold</b>', 'Create "<b>"']);
      expect(screen.getByText(markup.name)).toBeInTheDocument();
      expect(container.ownerDocument.querySelector('img[src="x"], .course-tags-modal b')).toBeNull();
    });

    it('still offers Create when the suggestions fail to load', async () => {
      await renderModal();
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road')).reply(403);
      await user().type(input(), 'road');
      await settle();
      expect(await screen.findByText('Suggestions could not be loaded.')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Create "road"' })).toBeInTheDocument();
    });

    it('shows only the error, not "No matching tags.", when the suggestions fail for an assigned name', async () => {
      await renderModal([ROAD]);
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road safety')).reply(403);
      await user().type(input(), 'road safety');
      await settle();
      expect(await screen.findByText('Suggestions could not be loaded.')).toBeInTheDocument();
      expect(screen.queryByText('No matching tags.')).not.toBeInTheDocument();
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('limits the input to 100 characters', async () => {
      await renderModal();
      expect(input()).toHaveAttribute('maxlength', '100');
    });
  });

  describe('assigning', () => {
    it('assigns an existing tag on click, sending its name', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, ROAD);
      await user().type(input(), 'road');
      await settle();
      await user().click(await screen.findByRole('option', { name: ROAD.name }));
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: ROAD.name }],
        ])
      );
      const list = await screen.findByRole('list', { name: 'Tags of this course' });
      expect(within(list).getByText(ROAD.name)).toBeInTheDocument();
      expect(screen.getByText('1 of 100 tags used').parentElement).toHaveTextContent('1/100');
    });

    it('creates a tag from the typed text, normalised, by clicking Create', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'new thing', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'new thing' });
      await user().type(input(), ' new   thing ');
      await settle();
      await user().click(await screen.findByRole('option', { name: 'Create "new thing"' }));
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: 'new thing' }],
        ])
      );
    });

    it('assigns the active option on Enter', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'i', [AIRPORT, NIGHT]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, NIGHT);
      const u = user();
      await u.type(input(), 'i');
      await settle();
      await screen.findAllByRole('option');
      await u.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: NIGHT.name }],
        ])
      );
    });

    it('does nothing on Enter with several options and none active', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'i', [AIRPORT, NIGHT]);
      const u = user();
      await u.type(input(), 'i');
      await settle();
      await screen.findAllByRole('option');
      await u.keyboard('{Enter}');
      expect(axiosMock.history.post).toHaveLength(0);
    });

    it('creates on Enter when Create is the only option', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'zzz' });
      const u = user();
      await u.type(input(), 'zzz');
      await settle();
      await screen.findByRole('option', { name: 'Create "zzz"' });
      await u.keyboard('{Enter}');
      await waitFor(() => expect(requestsOf(axiosMock, 'post')).toHaveLength(1));
    });

    it('assigns the tag named exactly as typed on Enter with none active', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'ROAD SAFETY', [ROAD]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, ROAD);
      const u = user();
      await u.type(input(), 'ROAD SAFETY');
      await settle();
      await screen.findByRole('option', { name: ROAD.name });
      expect(screen.getAllByRole('option')).toHaveLength(1); // no Create: the tag exists
      await u.keyboard('{Enter}');
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: ROAD.name }],
        ])
      );
    });

    it('prefers the exact match on Enter among other suggestions', async () => {
      await renderModal();
      const road = { id: 5, name: 'Road' };
      mockSuggestions(axiosMock, 'road', [ROAD, road, ROAD_SIGNS]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, road);
      const u = user();
      await u.type(input(), 'road');
      await settle();
      await screen.findByRole('option', { name: road.name });
      await u.keyboard('{Enter}');
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: road.name }],
        ])
      );
    });

    it('does nothing on Enter with blank text', async () => {
      await renderModal();
      const u = user();
      await u.click(input());
      await u.keyboard('{Enter}');
      expect(axiosMock.history.post).toHaveLength(0);
    });

    it('clears the field, closes the list and keeps focus in the field after a pick', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, ROAD);
      await user().type(input(), 'road');
      await settle();
      await user().click(await screen.findByRole('option', { name: ROAD.name }));
      expect(input()).toHaveValue('');
      expect(input()).toHaveFocus();
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('cancels a pending debounced request after a pick', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'zzz' });
      const u = user();
      await u.type(input(), 'zzz');
      await u.keyboard('{Enter}'); // before the debounce elapsed: Create is the only option
      await act(async () => {
        jest.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS * 2);
      });
      expect(suggestionRequests()).toHaveLength(0);
    });
  });

  describe('keyboard and ARIA', () => {
    const openList = async (term = 'i') => {
      await renderModal();
      mockSuggestions(axiosMock, term, [AIRPORT, NIGHT]);
      const u = user();
      await u.type(input(), term);
      await settle();
      await screen.findAllByRole('option');
      return u;
    };

    it('exposes a combobox controlling a listbox', async () => {
      await renderModal();
      expect(input()).toHaveAttribute('aria-autocomplete', 'list');
      expect(input()).toHaveAttribute('aria-expanded', 'false');
      const listbox = document.getElementById(input().getAttribute('aria-controls')!);
      expect(listbox).toHaveAttribute('role', 'listbox');
      expect(listbox).toHaveAccessibleName('Tag suggestions');
    });

    it('sets aria-expanded while the list is shown', async () => {
      await openList();
      expect(input()).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox', { name: 'Tag suggestions' })).toBeVisible();
    });

    it('has no active descendant until an arrow key is pressed', async () => {
      await openList();
      expect(input()).not.toHaveAttribute('aria-activedescendant');
      screen.getAllByRole('option').forEach((option) => expect(option).toHaveAttribute('aria-selected', 'false'));
    });

    it('moves the active option with ArrowDown and updates aria-activedescendant', async () => {
      const u = await openList();
      const options = screen.getAllByRole('option');
      await u.keyboard('{ArrowDown}');
      expect(input()).toHaveAttribute('aria-activedescendant', options[0].id);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      await u.keyboard('{ArrowDown}');
      expect(input()).toHaveAttribute('aria-activedescendant', options[1].id);
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
    });

    it('wraps from the last option to the first on ArrowDown', async () => {
      const u = await openList();
      const options = screen.getAllByRole('option'); // Airport, Night driving, Create "i"
      await u.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(input()).toHaveAttribute('aria-activedescendant', options[0].id);
    });

    it('wraps from the first option to the last on ArrowUp', async () => {
      const u = await openList();
      const options = screen.getAllByRole('option');
      await u.keyboard('{ArrowDown}{ArrowUp}');
      expect(input()).toHaveAttribute('aria-activedescendant', options[options.length - 1].id);
    });

    it('goes to the last option on ArrowUp from nothing', async () => {
      const u = await openList();
      const options = screen.getAllByRole('option');
      await u.keyboard('{ArrowUp}');
      expect(input()).toHaveAttribute('aria-activedescendant', options[options.length - 1].id);
    });

    it('closes the list on Escape and keeps the dialog open', async () => {
      const u = await openList();
      await u.keyboard('{Escape}');
      expect(input()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes the dialog on Escape when the list is closed', async () => {
      await renderModal();
      const u = user();
      await u.click(input());
      await u.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('reopens the list on ArrowDown after Escape', async () => {
      const u = await openList();
      await u.keyboard('{Escape}{ArrowDown}');
      expect(input()).toHaveAttribute('aria-expanded', 'true');
    });

    it('resets the active option when the text changes', async () => {
      const u = await openList();
      await u.keyboard('{ArrowDown}');
      await u.keyboard('b');
      expect(input()).not.toHaveAttribute('aria-activedescendant');
    });

    it('announces how many existing tags match', async () => {
      await openList();
      expect(screen.getByRole('status')).toHaveTextContent('2 matching tags');
    });
  });

  describe('removing', () => {
    it('removes a chip with a DELETE of its id', async () => {
      await renderModal([ROAD, NIGHT]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(204);
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      await waitFor(() => expect(screen.queryByText(ROAD.name)).not.toBeInTheDocument());
      expect(axiosMock.history.delete.map(({ url }) => url)).toEqual([apiUrls.courseTag(COURSE_ID, ROAD.id)]);
      expect(screen.getByText(NIGHT.name)).toBeInTheDocument();
      expect(screen.getByText('1 of 100 tags used').parentElement).toBeInTheDocument();
    });

    it('returns focus to the field once the chip is gone', async () => {
      await renderModal([ROAD]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(204);
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      await waitFor(() => expect(input()).toHaveFocus());
    });

    it('keeps the chip and shows an error when the removal fails', async () => {
      await renderModal([ROAD]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(500);
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      expect(await screen.findByText('The tag could not be removed. Try again.')).toBeInTheDocument();
      expect(screen.getByText(ROAD.name)).toBeInTheDocument();
    });

    it('shows the permission message when the removal is forbidden', async () => {
      await renderModal([ROAD]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(403);
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      expect(await screen.findByText('You don\'t have permission to make this change.')).toBeInTheDocument();
    });
  });

  describe('the limit of 100', () => {
    it('shows 100/100, disables the field and explains why', async () => {
      await renderModal(manyTags(100));
      expect(screen.getByText('100 of 100 tags used').parentElement).toHaveTextContent('100/100');
      expect(input()).toBeDisabled();
      expect(screen.getByText('This course has the maximum of 100 tags. Remove one to add another.'))
        .toBeInTheDocument();
      expect(screen.getByText(/maximum of 100 tags/).closest('[tabindex]')).not.toHaveFocus();
    });

    it('moves focus from the field to the explanation when the 100th tag is assigned', async () => {
      await renderModal(manyTags(99));
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'zzz' });
      const u = user();
      await u.type(input(), 'zzz');
      await settle();
      await u.click(await screen.findByRole('option', { name: 'Create "zzz"' }));
      await waitFor(() => expect(input()).toBeDisabled());
      expect(screen.getByText(/maximum of 100 tags/).closest('[tabindex="-1"]')).toHaveFocus();
    });

    it('keeps the field enabled at 99', async () => {
      await renderModal(manyTags(99));
      expect(input()).toBeEnabled();
      expect(screen.getByText('99 of 100 tags used').parentElement).toHaveTextContent('99/100');
      expect(screen.queryByText(/maximum of/)).not.toBeInTheDocument();
    });

    it('enables the field again after a chip is removed at 100', async () => {
      const tags = manyTags(100);
      await renderModal(tags);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, tags[0].id)).reply(204);
      await user().click(screen.getByRole('button', { name: `Remove ${tags[0].name}` }));
      await waitFor(() => expect(input()).toBeEnabled());
    });

    it('does not show the list for a disabled field', async () => {
      await renderModal(manyTags(100));
      expect(input()).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('assign errors', () => {
    const failAssign = async (status: number, body?: object) => {
      await renderModal();
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(status, body);
      const u = user();
      await u.type(input(), 'zzz');
      await settle();
      await u.click(await screen.findByRole('option', { name: 'Create "zzz"' }));
    };

    it.each([
      ['name_blank', { name: ['x'], name_code: 'name_blank' }, 'Enter a tag name.'],
      ['name_too_long', { name: ['x'], name_code: 'name_too_long' }, 'Use at most 100 characters.'],
    ])('maps %s to its message', async (_, body, message) => {
      await failAssign(400, body);
      expect(await screen.findByText(message)).toBeInTheDocument();
    });

    it('maps too_many_tags to its message', async () => {
      await failAssign(400, { detail: 'x', code: 'too_many_tags' });
      expect(await screen.findByText('A course can have at most 100 tags. Remove one first.')).toBeInTheDocument();
    });

    it('maps a 403 to the permission message', async () => {
      await failAssign(403);
      expect(await screen.findByText('You don\'t have permission to make this change.')).toBeInTheDocument();
    });

    it('maps a 404 (course gone) to the generic message', async () => {
      await failAssign(404, { detail: 'Course not found.' });
      expect(await screen.findByText('The tag could not be added. Try again.')).toBeInTheDocument();
    });

    it('maps an unknown 400 code to the generic message', async () => {
      await failAssign(400, { code: 'something_new' });
      expect(await screen.findByText('The tag could not be added. Try again.')).toBeInTheDocument();
    });

    it('adds no chip after an error', async () => {
      await failAssign(400, { name_code: 'name_blank' });
      await screen.findByText('Enter a tag name.');
      expect(screen.queryByRole('list', { name: 'Tags of this course' })).not.toBeInTheDocument();
    });

    it('clears the error on the next successful assign', async () => {
      await failAssign(400, { name_code: 'name_blank' });
      await screen.findByText('Enter a tag name.');
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'yyy' });
      mockSuggestions(axiosMock, 'yyy', []);
      const u = user();
      await u.type(input(), 'yyy');
      await settle();
      await u.click(await screen.findByRole('option', { name: 'Create "yyy"' }));
      await waitFor(() => expect(screen.queryByText('Enter a tag name.')).not.toBeInTheDocument());
    });
  });
});
