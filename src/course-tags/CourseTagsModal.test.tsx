import { act } from 'react';
import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import { logError } from '@edx/frontend-platform/logging';

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

jest.mock('@edx/frontend-platform/logging', () => ({
  ...jest.requireActual('@edx/frontend-platform/logging'),
  logError: jest.fn(),
}));

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
/** The hint under the field, found through the field's aria-describedby. */
const hint = () => document.getElementById(input().getAttribute('aria-describedby')!);
/** The counter shows "n/100" and reads "n of 100 tags used" to screen readers. */
const expectCounter = (count: number) => {
  expect(screen.getByText(`${count}/100`)).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByText(`${count} of 100 tags used`)).toBeInTheDocument();
};
const suggestionRequests = () => axiosMock.history.get.filter(({ url }) => url.includes('tag-suggestions'));

/** Let the debounce elapse, then wait until the suggestions request for `term` (normalised) has been sent. */
const searchSent = async (term: string) => {
  await act(async () => {
    jest.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);
  });
  await waitFor(() =>
    expect(suggestionRequests().map(({ url }) => url)).toContain(apiUrls.suggestions(COURSE_ID, term))
  );
};

/** A request the test answers later: pass `reply` to the mock, then call `respond(status, body)`. */
const later = () => {
  let resolve: (response: [number, unknown?]) => void = () => {};
  return {
    reply: () =>
      new Promise<[number, unknown?]>((r) => {
        resolve = r;
      }),
    respond: async (status: number, body?: unknown) => {
      await act(async () => {
        resolve([status, body]);
      });
    },
  };
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
      expectCounter(0);
      expect(screen.queryByRole('list', { name: 'Tags of this course' })).not.toBeInTheDocument();
    });

    it('lists the course tags as chips, by the order the server gave', async () => {
      await renderModal([NIGHT, ROAD]);
      const list = screen.getByRole('list', { name: 'Tags of this course' });
      expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        NIGHT.name,
        ROAD.name,
      ]);
      expectCounter(2);
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
      await searchSent('road safety');
      await waitFor(() => expect(suggestionRequests()).toHaveLength(1));
      expect(suggestionRequests()[0].url).toBe(apiUrls.suggestions(COURSE_ID, 'road safety'));
    });

    it('lists the suggestions and a Create option when there is no exact match', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD, ROAD_SIGNS]);
      await user().type(input(), 'road');
      await searchSent('road');
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual([ROAD.name, ROAD_SIGNS.name, 'Create "road"']);
    });

    it('drops suggestions that do not contain the typed text', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD, NIGHT]);
      await user().type(input(), 'road');
      await searchSent('road');
      await screen.findByRole('option', { name: ROAD.name });
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([ROAD.name, 'Create "road"']);
    });

    it('keeps suggestions that contain the text ignoring case and accents, as the server matches', async () => {
      await renderModal();
      const cafe = { id: 6, name: 'Café Rules' };
      mockSuggestions(axiosMock, 'cafe rules', [cafe]);
      await user().type(input(), 'cafe rules');
      await searchSent('cafe rules');
      expect(await screen.findByRole('option', { name: cafe.name })).toBeInTheDocument();
    });

    it('never shows or assigns the previous search\'s tags while the next search loads', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'road', [ROAD, ROAD_SIGNS]);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).replyOnce(201, ROAD);
      const u = user();
      await u.type(input(), 'road');
      await searchSent('road');
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
      await searchSent('ROAD safety');
      expect(await screen.findByRole('option', { name: ROAD.name })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    });

    it('offers no Create option when the exact match is already assigned', async () => {
      await renderModal([ROAD]);
      mockSuggestions(axiosMock, 'ROAD SAFETY', []);
      await user().type(input(), 'ROAD SAFETY');
      await searchSent('ROAD SAFETY');
      await screen.findByText('No matching tags.');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('does not offer a suggestion that is already assigned', async () => {
      await renderModal([ROAD]);
      mockSuggestions(axiosMock, 'road', [ROAD, ROAD_SIGNS]);
      await user().type(input(), 'road');
      await searchSent('road');
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual([ROAD_SIGNS.name, 'Create "road"']);
    });

    it('renders markup in tag names as text, in suggestions, Create and chips', async () => {
      const markup = { id: 9, name: '<img src=x onerror=alert(1)>' };
      const { container } = await renderModal([markup]);
      mockSuggestions(axiosMock, '<b>', [{ id: 10, name: '<b>bold</b>' }]);
      await user().type(input(), '<b>');
      await searchSent('<b>');
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual(['<b>bold</b>', 'Create "<b>"']);
      expect(screen.getByText(markup.name)).toBeInTheDocument();
      expect(container.ownerDocument.querySelector('img[src="x"], .course-tags-modal b')).toBeNull();
    });

    it('still offers Create when the suggestions fail to load', async () => {
      await renderModal();
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road')).reply(403);
      await user().type(input(), 'road');
      await searchSent('road');
      expect(await screen.findByText('Suggestions could not be loaded.')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Create "road"' })).toBeInTheDocument();
    });

    it('shows only the error, not "No matching tags.", when the suggestions fail for an assigned name', async () => {
      await renderModal([ROAD]);
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road safety')).reply(403);
      await user().type(input(), 'road safety');
      await searchSent('road safety');
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
      await searchSent('road');
      await user().click(await screen.findByRole('option', { name: ROAD.name }));
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: ROAD.name }],
        ])
      );
      const list = await screen.findByRole('list', { name: 'Tags of this course' });
      expect(within(list).getByText(ROAD.name)).toBeInTheDocument();
      expectCounter(1);
    });

    it('creates a tag from the typed text, normalised, by clicking Create', async () => {
      await renderModal();
      mockSuggestions(axiosMock, 'new thing', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'new thing' });
      await user().type(input(), ' new   thing ');
      await searchSent('new thing');
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
      await searchSent('i');
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
      await searchSent('i');
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
      await searchSent('zzz');
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
      await searchSent('ROAD SAFETY');
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
      await searchSent('road');
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
      await searchSent('road');
      await user().click(await screen.findByRole('option', { name: ROAD.name }));
      await waitFor(() => expect(input()).toHaveValue(''));
      expect(input()).toHaveFocus();
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('keeps text typed while the assign was saving', async () => {
      await renderModal();
      const post = later();
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(post.reply);
      const u = user();
      await u.type(input(), 'zzz');
      await searchSent('zzz');
      await u.click(await screen.findByRole('option', { name: 'Create "zzz"' }));
      expect(input()).toHaveValue('zzz'); // not cleared before the server answers
      await u.type(input(), 'y');
      await post.respond(201, { id: 9, name: 'zzz' });
      await screen.findByRole('list', { name: 'Tags of this course' });
      expect(input()).toHaveValue('zzzy');
    });

    it('ignores a second pick while the first is saving', async () => {
      await renderModal();
      const post = later();
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).replyOnce(post.reply);
      const u = user();
      await u.type(input(), 'zzz');
      await u.keyboard('{Enter}'); // Create is the only option
      await u.keyboard('{ArrowDown}{Enter}');
      expect(requestsOf(axiosMock, 'post')).toHaveLength(1);
      await post.respond(201, { id: 9, name: 'zzz' });
      await waitFor(() => expect(input()).toHaveValue(''));
      expect(requestsOf(axiosMock, 'post')).toHaveLength(1);
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
      await searchSent(term);
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

    // The options are Airport, Night driving, Create "i".
    const option = (name: string) => screen.getByRole('option', { name });
    const expectActive = (name: string) => {
      expect(input()).toHaveAttribute('aria-activedescendant', option(name).id);
      expect(option(name)).toHaveAttribute('aria-selected', 'true');
    };

    it('moves the active option with ArrowDown and updates aria-activedescendant', async () => {
      const u = await openList();
      await u.keyboard('{ArrowDown}');
      expectActive(AIRPORT.name);
      await u.keyboard('{ArrowDown}');
      expectActive(NIGHT.name);
      expect(option(AIRPORT.name)).toHaveAttribute('aria-selected', 'false');
    });

    it('wraps from the last option to the first on ArrowDown', async () => {
      const u = await openList();
      await u.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      expectActive(AIRPORT.name);
    });

    it('wraps from the first option to the last on ArrowUp', async () => {
      const u = await openList();
      await u.keyboard('{ArrowDown}{ArrowUp}');
      expectActive('Create "i"');
    });

    it('goes to the last option on ArrowUp from nothing', async () => {
      const u = await openList();
      await u.keyboard('{ArrowUp}');
      expectActive('Create "i"');
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

    it('keeps the highlighted option when results arrive between ArrowDown and Enter', async () => {
      await renderModal();
      const safety = { id: 7, name: 'Safety' };
      const suggestions = later();
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'saf')).reply(suggestions.reply);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'saf' });
      const u = user();
      await u.type(input(), 'saf');
      await searchSent('saf');
      await u.keyboard('{ArrowDown}'); // Create "saf" is the only option yet
      expectActive('Create "saf"');
      await suggestions.respond(200, [safety]);
      await screen.findByRole('option', { name: safety.name }); // now first, where Create was
      expectActive('Create "saf"');
      await u.keyboard('{Enter}');
      await waitFor(() =>
        expect(requestsOf(axiosMock, 'post')).toEqual([
          [apiUrls.courseTags(COURSE_ID), { name: 'saf' }],
        ])
      );
    });

    it('drops the highlight when the highlighted option goes away', async () => {
      await renderModal();
      const suggestions = later();
      axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road safety')).reply(suggestions.reply);
      const u = user();
      await u.type(input(), 'road safety');
      await searchSent('road safety');
      await u.keyboard('{ArrowDown}');
      expectActive('Create "road safety"');
      await suggestions.respond(200, [ROAD]); // an exact match: no Create any more
      await screen.findByRole('option', { name: ROAD.name });
      expect(input()).not.toHaveAttribute('aria-activedescendant');
      expect(option(ROAD.name)).toHaveAttribute('aria-selected', 'false');
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
      expectCounter(1);
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

    it('keeps focus on the cross of a chip whose removal failed, and logs the failure', async () => {
      await renderModal([ROAD]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(500);
      const cross = screen.getByRole('button', { name: `Remove ${ROAD.name}` });
      await user().click(cross);
      await screen.findByText('The tag could not be removed. Try again.');
      expect(cross).toHaveFocus();
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('does not move focus to the field on a later change after a failed removal', async () => {
      await renderModal([ROAD, NIGHT]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(500);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, NIGHT.id)).reply(204);
      const u = user();
      await u.click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      await screen.findByText('The tag could not be removed. Try again.');
      await u.click(screen.getByRole('button', { name: `Remove ${NIGHT.name}` }));
      // NIGHT's removal returns focus to the field; ROAD's failed one left nothing behind to refocus later.
      await waitFor(() => expect(input()).toHaveFocus());
      expect(screen.getByText(ROAD.name)).toBeInTheDocument();
      expect(screen.queryByText('The tag could not be removed. Try again.')).not.toBeInTheDocument();
    });

    it('treats a 404 as removed: the tag no longer exists', async () => {
      await renderModal([ROAD, NIGHT]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(404, { detail: 'Tag not found.' });
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      await waitFor(() => expect(screen.queryByText(ROAD.name)).not.toBeInTheDocument());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(logError).not.toHaveBeenCalled();
      await waitFor(() => expect(input()).toHaveFocus());
    });

    it('sends one DELETE for a double click on the cross', async () => {
      await renderModal([ROAD, NIGHT]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(204);
      await user().dblClick(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      await waitFor(() => expect(screen.queryByText(ROAD.name)).not.toBeInTheDocument());
      expect(requestsOf(axiosMock, 'delete')).toHaveLength(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not log a forbidden removal, which the API documents', async () => {
      await renderModal([ROAD]);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(403);
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      await screen.findByText('You don\'t have permission to make this change.');
      expect(logError).not.toHaveBeenCalled();
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
      expectCounter(100);
      expect(input()).toBeDisabled();
      expect(screen.getByText('This course has the maximum of 100 tags. Remove one to add another.'))
        .toBeInTheDocument();
      expect(input()).toHaveAccessibleDescription(/maximum of 100 tags/);
      expect(hint()).not.toHaveFocus();
    });

    it('moves focus from the field to the explanation when the 100th tag is assigned', async () => {
      await renderModal(manyTags(99));
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'zzz' });
      const u = user();
      await u.type(input(), 'zzz');
      await searchSent('zzz');
      await u.click(await screen.findByRole('option', { name: 'Create "zzz"' }));
      await waitFor(() => expect(input()).toBeDisabled());
      await waitFor(() => expect(hint()).toHaveFocus());
      expect(input()).toHaveValue('');
      expect(hint()).toHaveTextContent('This course has the maximum of 100 tags. Remove one to add another.');
      expect(hint()).toHaveFocus();
    });

    it('keeps the field enabled and focused when the 99th tag is assigned', async () => {
      await renderModal(manyTags(98));
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'zzz' });
      const u = user();
      await u.type(input(), 'zzz');
      await searchSent('zzz');
      await u.click(await screen.findByRole('option', { name: 'Create "zzz"' }));
      await waitFor(() => expectCounter(99));
      expect(input()).toBeEnabled();
      expect(input()).toHaveFocus();
      expect(input()).not.toHaveAccessibleDescription();
    });

    it('keeps the field enabled at 99', async () => {
      await renderModal(manyTags(99));
      expect(input()).toBeEnabled();
      expectCounter(99);
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
    const failAssign = async (status: number, body?: object, assigned: { id: number; name: string; }[] = []) => {
      await renderModal(assigned);
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(status, body);
      const u = user();
      await u.type(input(), 'zzz');
      await searchSent('zzz');
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

    it('maps a 404 (course gone) to a message without "Try again", and logs it', async () => {
      await failAssign(404, { detail: 'Course not found.' });
      expect(await screen.findByText('The tag could not be added.')).toBeInTheDocument();
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('maps an unknown 400 code to a message without "Try again", and logs it', async () => {
      await failAssign(400, { code: 'something_new' });
      expect(await screen.findByText('The tag could not be added.')).toBeInTheDocument();
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('asks to try again after a 5xx, and logs it', async () => {
      await failAssign(500);
      expect(await screen.findByText('The tag could not be added. Try again.')).toBeInTheDocument();
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a 403', 403, undefined],
      ['a known 400 code', 400, { name_code: 'name_too_long' }],
    ])('does not log %s, which the API documents', async (_, status, body) => {
      await failAssign(status, body);
      await screen.findByRole('alert');
      expect(logError).not.toHaveBeenCalled();
    });

    it('keeps the typed text when the assign fails, to fix or retry', async () => {
      await failAssign(400, { name_code: 'name_too_long' });
      await screen.findByText('Use at most 100 characters.');
      expect(input()).toHaveValue('zzz');
      expect(input()).toHaveFocus();
    });

    it('adds no chip after an error', async () => {
      await failAssign(400, { name_code: 'name_blank' });
      await screen.findByText('Enter a tag name.');
      expect(screen.queryByRole('list', { name: 'Tags of this course' })).not.toBeInTheDocument();
    });

    it('ignores a removal while an assign is saving, so the assign\'s error still shows', async () => {
      await renderModal([ROAD]);
      const post = later();
      mockSuggestions(axiosMock, 'zzz', []);
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(post.reply);
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(204);
      const u = user();
      await u.type(input(), 'zzz');
      await u.keyboard('{Enter}');
      await u.click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      expect(requestsOf(axiosMock, 'delete')).toHaveLength(0);
      await post.respond(400, { code: 'too_many_tags' });
      expect(await screen.findByText('A course can have at most 100 tags. Remove one first.')).toBeInTheDocument();
      expect(screen.getByText(ROAD.name)).toBeInTheDocument();
    });

    it('replaces an assign error with the error of the next change that fails', async () => {
      await failAssign(400, { name_code: 'name_too_long' }, [ROAD]);
      await screen.findByText('Use at most 100 characters.');
      axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, ROAD.id)).reply(500);
      await user().click(screen.getByRole('button', { name: `Remove ${ROAD.name}` }));
      expect(await screen.findByText('The tag could not be removed. Try again.')).toBeInTheDocument();
      expect(screen.queryByText('Use at most 100 characters.')).not.toBeInTheDocument();
    });

    it('clears the error on the next successful assign', async () => {
      await failAssign(400, { name_code: 'name_blank' });
      await screen.findByText('Enter a tag name.');
      axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 9, name: 'yyy' });
      mockSuggestions(axiosMock, 'yyy', []);
      const u = user();
      await u.clear(input()); // a failed assign keeps the text
      await u.type(input(), 'yyy');
      await searchSent('yyy');
      await u.click(await screen.findByRole('option', { name: 'Create "yyy"' }));
      await waitFor(() => expect(screen.queryByText('Enter a tag name.')).not.toBeInTheDocument());
    });
  });
});
