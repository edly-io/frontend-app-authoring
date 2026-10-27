import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import * as api from './data/api';
import PublishHistoryComparePage from './PublishHistoryComparePage';
import {
  COURSE_ID,
  diffResult,
  V1,
  V2,
  V3,
  version,
} from './testHelpers';
import messages from './messages';

jest.mock('./data/api');
jest.mock('@src/CourseAuthoringContext', () => ({
  useCourseAuthoringContext: () => ({ courseId: 'course-v1:Uber+101+2026', courseDetails: { name: 'Driving' } }),
}));

const getVersions = api.getVersions as jest.Mock;
const getDiff = api.getDiff as jest.Mock;

const renderPage = (search = `?version=${V3}`) =>
  render(<PublishHistoryComparePage />, { routerProps: { initialEntries: [`/compare${search}`] } });

const toggle = () => screen.getByRole('button', { name: /^Compare With/ });
const listLoaded = () => screen.findByText(V3.slice(0, 7));
const loadMore = () => screen.queryByRole('button', { name: /Load More Versions/ });

/** Replaces the setup's IntersectionObserver with one the test can drive. */
const observers: { callback: (entries: Array<{ isIntersecting: boolean; }>) => void; disconnect: jest.Mock; }[] = [];
const mockObserver = () => {
  observers.length = 0;
  global.IntersectionObserver = jest.fn(function mockIntersectionObserver(callback) {
    const entry = { callback, disconnect: jest.fn() };
    observers.push(entry);
    this.observe = jest.fn();
    this.disconnect = entry.disconnect;
  }) as unknown as typeof IntersectionObserver;
};
const setInView = (isIntersecting: boolean) =>
  act(() => observers.forEach((observer) => observer.callback([{ isIntersecting }])));

describe('<PublishHistoryComparePage /> outline follow-up', () => {
  beforeEach(() => {
    initializeMocks();
    mockObserver();
    getVersions.mockResolvedValue({
      results: [
        version(V3, { isCurrent: true }),
        version(V2, { publishedBy: { id: 9, username: 'older' } }),
      ],
      nextAfter: null,
      historyEnds: null,
    });
    getDiff.mockResolvedValue(diffResult());
  });

  describe('version cards (O4, O6)', () => {
    it('shows "date by user · short id" under the heading, with the full id in a title and no Published Version', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      const selected = screen.getByRole('region', { name: messages.cardSelected.defaultMessage });
      expect(selected).toHaveTextContent(/by editor · 3333333/);
      expect(within(selected).getByTitle(V3)).toBeInTheDocument();
      const target = screen.getByRole('region', { name: messages.cardTarget.defaultMessage });
      expect(target).toHaveTextContent(/by writer · 2222222/);
      expect(within(target).getByTitle(V2)).toBeInTheDocument();
      expect(selected).not.toHaveTextContent('Published Version');
      expect(target).not.toHaveTextContent('Published Version');
    });
  });

  describe('sticky bar (O5)', () => {
    it('is hidden while the version cards are in view', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      expect(screen.queryByTestId('publish-history-sticky-bar')).not.toBeInTheDocument();
      setInView(true);
      expect(screen.queryByTestId('publish-history-sticky-bar')).not.toBeInTheDocument();
    });

    it('shows both sides, the selected one first, when the cards scroll out of view', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      setInView(false);
      const bar = screen.getByTestId('publish-history-sticky-bar');
      expect(bar).toHaveTextContent(/Selected Version · .* by editor · 3333333.*Compare With · .* by writer · 2222222/);
      expect(within(bar).getAllByTitle(/^[23]{24}$/)).toHaveLength(2);
      expect(within(bar).queryByRole('button', { hidden: true })).not.toBeInTheDocument();
    });

    it('is hidden from screen readers, which get the same lines from the version cards', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      setInView(false);
      expect(screen.getByTestId('publish-history-sticky-bar')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('region', { name: /Compared versions/ })).not.toBeInTheDocument();
    });

    it('keeps the selected version on the left when it is the older one', async () => {
      renderPage(`?version=${V2}&against=${V3}`);
      await screen.findByText('1 changed block');
      setInView(false);
      expect(screen.getByTestId('publish-history-sticky-bar')).toHaveTextContent(
        /Selected Version · .* by writer · 2222222.*Compare With · .* by editor · 3333333/,
      );
    });

    it('hides again when the cards come back into view', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      setInView(false);
      expect(screen.getByTestId('publish-history-sticky-bar')).toBeInTheDocument();
      setInView(true);
      expect(screen.queryByTestId('publish-history-sticky-bar')).not.toBeInTheDocument();
    });

    it('shows only the selected side before a comparison has loaded', async () => {
      renderPage();
      await listLoaded();
      setInView(false);
      const bar = screen.getByTestId('publish-history-sticky-bar');
      expect(bar).toHaveTextContent('Selected Version · ');
      expect(bar).not.toHaveTextContent(messages.cardTarget.defaultMessage);
    });

    it('stops observing when the page unmounts', async () => {
      const { unmount } = renderPage();
      await listLoaded();
      unmount();
      expect(observers.length).toBeGreaterThan(0);
      observers.forEach((observer) => expect(observer.disconnect).toHaveBeenCalled());
    });
  });

  describe('Load More Versions in the dropdown (O7)', () => {
    const firstPage = () =>
      getVersions.mockResolvedValueOnce({ results: [version(V3)], nextAfter: V3, historyEnds: null });
    const oldest = version(V1, { publishedBy: { id: 4, username: 'oldest' } });

    it('is the last item of the open menu when more versions exist', async () => {
      firstPage();
      renderPage();
      await listLoaded();
      expect(loadMore()).not.toBeInTheDocument();
      await userEvent.click(toggle());
      const button = await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage });
      const menu = button.closest('.dropdown-menu') as HTMLElement;
      expect(menu).toHaveClass('show');
      expect(within(menu).getAllByRole('button').at(-1)).toBe(button);
    });

    it('is not shown when there is no next page', async () => {
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      expect(loadMore()).not.toBeInTheDocument();
    });

    it('fetches the next page, keeps the menu open and shows the new versions', async () => {
      firstPage();
      getVersions.mockResolvedValueOnce({ results: [oldest], nextAfter: null, historyEnds: null });
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage }));
      const added = await screen.findByRole('button', { name: /by oldest$/ });
      expect(getVersions).toHaveBeenLastCalledWith(COURSE_ID, V3);
      expect(getVersions).toHaveBeenCalledTimes(2);
      expect(added.closest('.dropdown-menu')).toHaveClass('show');
      expect(toggle()).toHaveAttribute('aria-expanded', 'true');
      expect(loadMore()).not.toBeInTheDocument();
    });

    it('does not pick an option or change the choice when clicked', async () => {
      firstPage();
      getVersions.mockResolvedValueOnce({ results: [oldest], nextAfter: null, historyEnds: null });
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage }));
      await screen.findByRole('button', { name: /by oldest$/ });
      expect(toggle()).toHaveTextContent(messages.optionPrevious.defaultMessage);
    });

    it('shows a spinner while loading and ignores a second click', async () => {
      firstPage();
      let resolve: (value: unknown) => void = () => {};
      getVersions.mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      );
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      const button = await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage });
      await userEvent.click(button);
      expect(await within(button).findByText(messages.loadingMoreVersions.defaultMessage)).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-busy', 'true');
      await userEvent.click(button);
      await userEvent.click(button);
      expect(getVersions).toHaveBeenCalledTimes(2);
      await act(async () => resolve({ results: [oldest], nextAfter: null, historyEnds: null }));
      await screen.findByRole('button', { name: /by oldest$/ });
      expect(screen.queryByText(messages.loadingMoreVersions.defaultMessage)).not.toBeInTheDocument();
    });

    it('can be reached with the arrow keys and activated with Enter', async () => {
      firstPage();
      getVersions.mockResolvedValueOnce({ results: [oldest], nextAfter: null, historyEnds: null });
      renderPage();
      await listLoaded();
      toggle().focus();
      await userEvent.keyboard('{Enter}');
      const button = await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage });
      await waitFor(() => expect(button.closest('.dropdown-menu')).toHaveClass('show'));
      const items = within(button.closest('.dropdown-menu') as HTMLElement).getAllByRole('button');
      for (let i = 0; i < items.length && document.activeElement !== button; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await userEvent.keyboard('{ArrowDown}');
      }
      expect(button).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(await screen.findByRole('button', { name: /by oldest$/ })).toBeInTheDocument();
    });

    it('moves the focus to the first new version when the last page replaces the item', async () => {
      firstPage();
      getVersions.mockResolvedValueOnce({ results: [oldest], nextAfter: null, historyEnds: null });
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      const button = await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage });
      button.focus();
      await userEvent.keyboard('{Enter}');
      const added = await screen.findByRole('button', { name: /by oldest$/ });
      expect(loadMore()).not.toBeInTheDocument();
      await waitFor(() => expect(added).toHaveFocus());
      await userEvent.keyboard('{Escape}');
      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    });

    it('keeps the focus on the item when loading fails', async () => {
      firstPage();
      getVersions.mockRejectedValueOnce({ response: { status: 403, data: {} } });
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      const button = await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage });
      button.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(getVersions).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.queryByText(messages.loadingMoreVersions.defaultMessage)).not.toBeInTheDocument()
      );
      expect(screen.getByRole('button', { name: messages.loadMoreVersions.defaultMessage })).toHaveFocus();
    });

    it('keeps the item for another try when loading fails', async () => {
      firstPage();
      getVersions.mockRejectedValueOnce({ response: { status: 403, data: {} } });
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage }));
      await waitFor(() => expect(getVersions).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.queryByText(messages.loadingMoreVersions.defaultMessage)).not.toBeInTheDocument()
      );
      expect(await screen.findByRole('button', { name: messages.loadMoreVersions.defaultMessage })).toBeInTheDocument();
    });
  });
});
