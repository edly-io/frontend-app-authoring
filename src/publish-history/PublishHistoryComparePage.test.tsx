import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import {
  act,
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
  field,
  httpError,
  LocationProbe,
  node,
  V1,
  V2,
  V3,
  version,
} from './testHelpers';

jest.mock('./data/api');
jest.mock('@src/CourseAuthoringContext', () => ({
  useCourseAuthoringContext: () => ({ courseId: 'course-v1:Uber+101+2026', courseDetails: { name: 'Driving' } }),
}));

const getVersions = api.getVersions as jest.Mock;
const getDiff = api.getDiff as jest.Mock;

const renderPage = (search = `?version=${V3}`) =>
  render(<PublishHistoryComparePage />, {
    routerProps: { initialEntries: [`/compare${search}`] },
    extraWrapper: ({ children }) => (
      <>
        {children}
        <LocationProbe />
      </>
    ),
  });

const NavProbe = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>Go back</button>
      <button type="button" onClick={() => navigate(1)}>Go forward</button>
    </>
  );
};

const renderWithNav = (search = `?version=${V3}`) =>
  render(<PublishHistoryComparePage />, {
    routerProps: { initialEntries: [`/compare${search}`] },
    extraWrapper: ({ children }) => (
      <>
        {children}
        <LocationProbe />
        <NavProbe />
      </>
    ),
  });

const location = () => screen.getByTestId('location').textContent;
const toggle = () => screen.getByRole('button', { name: /^Compare With/ });
/** The selected version's short id shows once the version list has loaded. */
const listLoaded = () => screen.findByText(V3.slice(0, 7));
const card = (heading: string) => screen.getByText(heading).closest('.card') as HTMLElement;

describe('<PublishHistoryComparePage />', () => {
  beforeEach(() => {
    initializeMocks();
    getVersions.mockResolvedValue({
      results: [version(V3, { isCurrent: true }), version(V2, { publishedBy: { id: 9, username: 'older' } })],
      nextAfter: null,
      historyEnds: null,
    });
    getDiff.mockResolvedValue(diffResult());
  });

  describe('before comparing', () => {
    it('defaults to the previous version and fetches nothing until Compare is pressed', async () => {
      renderPage();
      expect(toggle()).toHaveTextContent('Previous Version');
      await waitFor(() => expect(getVersions).toHaveBeenCalled());
      expect(getDiff).not.toHaveBeenCalled();
    });

    it('offers previous, published and the other loaded versions but not the draft or the version itself', async () => {
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      const items = (await screen.findAllByRole('button')).map((button) => button.textContent);
      expect(items).toEqual(expect.arrayContaining([
        'Previous Version',
        'Current Published Version',
      ]));
      expect(items).not.toContain('Current Draft');
      expect(items.filter((text) => text?.endsWith('by older'))).toHaveLength(1);
      expect(items.filter((text) => text?.endsWith('by writer'))).toHaveLength(0);
    });

    it('names the version being compared once the list is loaded', async () => {
      renderPage();
      await listLoaded();
      expect(within(card('Selected Version')).getByText(V3.slice(0, 7))).toBeInTheDocument();
    });

    it('links back to the publish history list', async () => {
      renderPage();
      expect(await screen.findByRole('link', { name: 'Back to Publish History' }))
        .toHaveAttribute('href', `/course/${COURSE_ID}/publish_history`);
    });

    it('disables Compare when the URL has no version', async () => {
      renderPage('');
      expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled();
      await waitFor(() => expect(getVersions).toHaveBeenCalled());
      expect(getDiff).not.toHaveBeenCalled();
    });

    it('does not fetch a diff for an empty version even when against is in the URL', async () => {
      renderPage('?against=published');
      await waitFor(() => expect(getVersions).toHaveBeenCalled());
      expect(getDiff).not.toHaveBeenCalled();
    });
  });

  describe('Compare button', () => {
    it('fetches the comparison with the previous version and writes against to the URL', async () => {
      renderPage();
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, 'previous'));
      expect(location()).toBe(`/compare?version=${V3}&against=previous`);
    });

    it('compares with "Current Published Version"', async () => {
      renderPage();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Current Published Version' }));
      expect(getDiff).not.toHaveBeenCalled(); // choosing alone does not fetch
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, 'published'));
      expect(location()).toBe(`/compare?version=${V3}&against=published`);
    });

    it('compares with an older version by its id', async () => {
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: /by older$/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, V2));
      expect(location()).toBe(`/compare?version=${V3}&against=${V2}`);
    });

    it('keeps the version and replaces an earlier against', async () => {
      renderPage(`?version=${V3}&against=published`);
      await listLoaded();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: /by older$/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(location()).toBe(`/compare?version=${V3}&against=${V2}`));
    });
  });

  describe('opening a URL with against', () => {
    it('renders the comparison directly and shows the chosen option', async () => {
      renderPage(`?version=${V3}&against=published`);
      expect(await screen.findByText('1 changed block')).toBeInTheDocument();
      expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, 'published');
      expect(toggle()).toHaveTextContent('Current Published Version');
    });

    it('passes a version id as against', async () => {
      renderPage(`?version=${V3}&against=${V1}`);
      await screen.findByText('1 changed block');
      expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, V1);
    });

    it('shows a short id for an against version that is not loaded', async () => {
      renderPage(`?version=${V3}&against=${V1}`);
      expect(toggle()).toHaveTextContent(V1.slice(0, 7));
    });
  });

  describe('result', () => {
    it('names both sides, the selected version on the left', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      const selected = within(card('Selected Version'));
      expect(selected.getByText('Newer')).toBeInTheDocument();
      expect(selected.getByText('editor', { selector: 'strong' })).toBeInTheDocument();
      const target = within(card('Compare With'));
      expect(target.getByText('Older')).toBeInTheDocument();
      expect(target.getByText('writer', { selector: 'strong' })).toBeInTheDocument();
      expect(target.getByText(V2.slice(0, 7))).toBeInTheDocument();
    });

    it('labels published and draft sides', async () => {
      getDiff.mockResolvedValue(diffResult({
        to: { id: V3, kind: 'draft', at: null, by: null },
        from: { id: V2, kind: 'published', at: null, by: null },
      }));
      renderPage(`?version=${V3}&against=published`);
      await screen.findByText('1 changed block');
      expect(within(card('Selected Version')).getByText('Current Draft')).toBeInTheDocument();
      expect(within(card('Compare With')).getByText('Current')).toBeInTheDocument();
      expect(screen.queryByText(/Published Version$/, { selector: 'div' })).not.toBeInTheDocument();
      expect(screen.getAllByText('Unknown', { selector: 'strong' })).toHaveLength(2);
    });

    it('renders the diff tree', async () => {
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByRole('list', { name: 'Changed blocks' })).toBeInTheDocument();
      expect(screen.getByText('Intro text')).toBeInTheDocument();
    });

    it('says when both sides are the same version', async () => {
      getDiff.mockResolvedValue(diffResult({ identical: true, totalChanges: 0, tree: [] }));
      renderPage(`?version=${V3}&against=${V3}`);
      expect(await screen.findByText('These are the same version, so nothing differs.')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Changed blocks' })).not.toBeInTheDocument();
    });

    it('says when two versions have no differences', async () => {
      getDiff.mockResolvedValue(diffResult({ totalChanges: 0, tree: [] }));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText('No differences in the course content or settings.')).toBeInTheDocument();
    });

    it('warns when the list is truncated, with the shown and total counts', async () => {
      getDiff.mockResolvedValue(diffResult({
        truncated: true,
        totalChanges: 700,
        tree: [node({ children: [node({ usageKey: 'b2' }), node({ usageKey: 'b3', change: null })] })],
      }));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText('Only the first 2 of 700 changed blocks are listed.')).toBeInTheDocument();
      expect(screen.getByText('700 changed blocks')).toBeInTheDocument();
    });

    it('does not warn when not truncated', async () => {
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      expect(screen.queryByText(/Only the first/)).not.toBeInTheDocument();
    });

    it('shows nothing of the old result while a new comparison loads', async () => {
      getDiff.mockReturnValue(new Promise(() => {}));
      renderPage(`?version=${V3}&against=previous`);
      await waitFor(() => expect(getDiff).toHaveBeenCalled());
      expect(screen.queryByText(/changed block/)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders an HTML payload as text, not markup', async () => {
      const payload = '<script>window.__pwned = true</script><img src=x onerror="window.__pwned = true">';
      getDiff.mockResolvedValue(diffResult({
        tree: [node({
          fields: [field({
            name: 'data',
            scope: 'content',
            old: null,
            new: null,
            textDiff: { kind: 'words', segments: [{ op: 'insert', text: payload }] },
          })],
        })],
      }));
      const { container } = renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText(payload, { exact: false })).toBeInTheDocument();
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect((window as any).__pwned).toBeUndefined();
    });
  });

  describe('errors', () => {
    const failWith = async (error: object) => {
      getDiff.mockRejectedValue(error);
      renderPage(`?version=${V3}&against=previous`);
    };

    it('explains a version that is not in this course (404 version_not_found)', async () => {
      await failWith(httpError(404, { code: 'version_not_found' }));
      expect(await screen.findByText('That version is not part of this course\'s history.')).toBeInTheDocument();
    });

    it('explains a pruned version (410)', async () => {
      await failWith(httpError(410, { code: 'version_pruned' }));
      expect(await screen.findByText(/data of one of these versions was removed/)).toBeInTheDocument();
    });

    it('explains that the oldest version has no previous one (400 no_previous_version)', async () => {
      await failWith(httpError(400, { detail: 'This is the oldest version.', code: 'no_previous_version' }));
      expect(await screen.findByText(/This is the oldest version, so there is no previous version/))
        .toBeInTheDocument();
    });

    it('shows the permission message for a 403', async () => {
      await failWith(httpError(403));
      expect(await screen.findByText(/not available for this course or your account/)).toBeInTheDocument();
    });

    it('explains a malformed version in the address (another 400)', async () => {
      await failWith(httpError(400, { against: ['Enter a version id, "published" or "draft".'] }));
      expect(await screen.findByText(/This page address names an invalid version/)).toBeInTheDocument();
    });

    it('shows the generic message for another failure', async () => {
      await failWith(httpError(404));
      expect(await screen.findByText('The comparison could not be loaded. Try again.')).toBeInTheDocument();
    });

    it('shows no tree after an error', async () => {
      await failWith(httpError(404, { code: 'version_not_found' }));
      await screen.findByRole('alert');
      expect(screen.queryByRole('list', { name: 'Changed blocks' })).not.toBeInTheDocument();
    });

    it('still lets the user pick another version after an error', async () => {
      await failWith(httpError(404, { code: 'version_not_found' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('button', { name: 'Compare' })).toBeEnabled();
    });
  });

  describe('more versions', () => {
    it('loads older versions into the options', async () => {
      getVersions
        .mockResolvedValueOnce({ results: [version(V3)], nextAfter: V3, historyEnds: null })
        .mockResolvedValueOnce({
          results: [version(V1, { publishedBy: { id: 4, username: 'oldest' } })],
          nextAfter: null,
          historyEnds: null,
        });
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Load More Versions' }));
      await waitFor(() => expect(getVersions).toHaveBeenLastCalledWith(COURSE_ID, V3));
      expect(await screen.findByRole('button', { name: /by oldest$/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Load More Versions' })).not.toBeInTheDocument();
    });

    it('has no Load More Versions item when all versions are loaded', async () => {
      renderPage();
      await listLoaded();
      await userEvent.click(toggle());
      expect(screen.queryByRole('button', { name: 'Load More Versions' })).not.toBeInTheDocument();
    });

    it('still compares when the version list fails to load, and says why the options are few', async () => {
      getVersions.mockRejectedValue(httpError(404));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText('1 changed block')).toBeInTheDocument();
      expect(await screen.findByText(/The list of versions could not be loaded/)).toBeInTheDocument();
    });

    it('shows only the permission message when the API refuses the list (flag off or no access)', async () => {
      getVersions.mockRejectedValue(httpError(403));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText(/not available for this course or your account/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Compare' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Compare With/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Changed blocks' })).not.toBeInTheDocument();
      expect(screen.queryByText(/The list of versions could not be loaded/)).not.toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('has a title heading and no "Content" subtitle', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { name: 'Compare Versions' })).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('shows the back link above the title with an arrow', async () => {
      renderPage();
      const link = await screen.findByRole('link', { name: 'Back to Publish History' });
      expect(link.querySelector('svg')).toBeInTheDocument();
      expect(link.compareDocumentPosition(screen.getByRole('heading', { name: 'Compare Versions' })))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('puts the selected version on the left and the compare target on the right', async () => {
      renderPage();
      expect(card('Selected Version').compareDocumentPosition(card('Compare With')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('holds the dropdown and Compare button in the right-hand card only', async () => {
      renderPage();
      expect(within(card('Compare With')).getByRole('button', { name: 'Compare' })).toBeInTheDocument();
      expect(within(card('Selected Version')).queryByRole('button', { name: 'Compare' })).not.toBeInTheDocument();
    });
  });

  describe('column orientation follows time', () => {
    const scalar = diffResult({
      tree: [node({ fields: [field()] })],
    });

    it('labels the selected version Newer and the other Older when the selected one is the newer', async () => {
      getDiff.mockResolvedValue(scalar);
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      expect(within(card('Selected Version')).getByText('Newer')).toBeInTheDocument();
      expect(within(card('Compare With')).getByText('Older')).toBeInTheDocument();
    });

    it('labels the selected version Older and the other Newer when the selected one is the older', async () => {
      getDiff.mockResolvedValue(scalar);
      renderPage(`?version=${V2}&against=published`);
      await screen.findByText('1 changed block');
      expect(within(card('Selected Version')).getByText('Older')).toBeInTheDocument();
      expect(within(card('Compare With')).getByText('Newer')).toBeInTheDocument();
    });

    it('shows the selected (newer) version\'s value on the left in green, the older one on the right in red', async () => {
      getDiff.mockResolvedValue(scalar);
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('1 changed block');
      const fresh = screen.getByText('New name');
      const old = screen.getByText('Old name');
      expect(fresh).toHaveClass('publish-history-value-newer');
      expect(old).toHaveClass('publish-history-value-older');
      expect(fresh.compareDocumentPosition(old)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('shows the selected (older) version\'s value on the left in red, the newer one on the right in green', async () => {
      getDiff.mockResolvedValue(scalar);
      renderPage(`?version=${V2}&against=published`);
      await screen.findByText('1 changed block');
      const fresh = screen.getByText('New name');
      const old = screen.getByText('Old name');
      expect(old).toHaveClass('publish-history-value-older');
      expect(fresh).toHaveClass('publish-history-value-newer');
      expect(old.compareDocumentPosition(fresh)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('shows text removals only in the older column and additions only in the newer one', async () => {
      getDiff.mockResolvedValue(diffResult({
        tree: [node({
          fields: [field({
            name: 'data',
            scope: 'content',
            old: null,
            new: null,
            textDiff: { kind: 'words', segments: [{ op: 'delete', text: 'gone' }, { op: 'insert', text: 'fresh' }] },
          })],
        })],
      }));
      renderPage(`?version=${V3}&against=previous`);
      const left = await screen.findByRole('group', { name: 'Changes in data, newer version' });
      const right = screen.getByRole('group', { name: 'Changes in data, older version' });
      expect(left.querySelector('ins')).toHaveTextContent('fresh');
      expect(left.querySelector('del')).toBeNull();
      expect(right.querySelector('del')).toHaveTextContent('gone');
      expect(right.querySelector('ins')).toBeNull();
    });

    it('warns when the diff budget ran out', async () => {
      getDiff.mockResolvedValue(diffResult({ budgetExhausted: true }));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText(/Too many changes to compare in full/)).toBeInTheDocument();
    });

    it('renders a field that was too large for the budget with its own note', async () => {
      getDiff.mockResolvedValue(diffResult({
        tree: [node({ fields: [field({ tooLarge: true, tooLargeReason: 'budget' })] })],
      }));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findAllByText(/Not compared, as this comparison has too many changes/)).toHaveLength(2);
    });

    it('renders a JSON field with only the changed key highlighted and the unchanged count', async () => {
      getDiff.mockResolvedValue(diffResult({
        tree: [node({
          fields: [field({
            old: null,
            new: null,
            jsonDiff: {
              changes: [{
                path: ['color'],
                oldPath: null,
                op: 'changed',
                old: 'red',
                new: 'blue',
                tooLarge: false,
              }],
              unchanged: [{ path: [], count: 4 }],
              truncated: false,
            },
          })],
        })],
      }));
      const { container } = renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findAllByText('4 unchanged entries')).toHaveLength(2);
      expect(container.querySelectorAll('.publish-history-json del')).toHaveLength(1);
      expect(container.querySelectorAll('.publish-history-json ins')).toHaveLength(1);
    });

    it('renders a <script> payload in a JSON key and value as text', async () => {
      const payload = '<script>window.__pwned = true</script>';
      getDiff.mockResolvedValue(diffResult({
        tree: [node({
          fields: [field({
            old: null,
            new: null,
            jsonDiff: {
              changes: [{
                path: [payload],
                oldPath: null,
                op: 'changed',
                old: payload,
                new: payload,
                tooLarge: false,
              }],
              unchanged: [],
              truncated: false,
            },
          })],
        })],
      }));
      const { container } = renderPage(`?version=${V3}&against=previous`);
      expect((await screen.findAllByText(payload, { exact: false })).length).toBeGreaterThan(0);
      expect(container.querySelector('script')).toBeNull();
      expect((window as any).__pwned).toBeUndefined();
    });
  });

  describe('Back and Forward', () => {
    it('moves the dropdown with the URL', async () => {
      renderWithNav();
      expect(toggle()).toHaveTextContent('Previous Version');
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Current Published Version' }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(location()).toBe(`/compare?version=${V3}&against=published`));
      expect(toggle()).toHaveTextContent('Current Published Version');

      await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
      await waitFor(() => expect(location()).toBe(`/compare?version=${V3}`));
      expect(toggle()).toHaveTextContent('Previous Version');

      await userEvent.click(screen.getByRole('button', { name: 'Go forward' }));
      await waitFor(() => expect(toggle()).toHaveTextContent('Current Published Version'));
    });

    it('moves the dropdown between two compared targets', async () => {
      renderWithNav(`?version=${V3}&against=published`);
      expect(toggle()).toHaveTextContent('Current Published Version');
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Previous Version' }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(toggle()).toHaveTextContent('Previous Version'));
      await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
      await waitFor(() => expect(toggle()).toHaveTextContent('Current Published Version'));
    });

    it('fetches the diff of the URL it went back to', async () => {
      renderWithNav(`?version=${V3}&against=published`);
      await screen.findByText('1 changed block');
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Previous Version' }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenLastCalledWith(COURSE_ID, V3, 'previous'));
      await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
      await waitFor(() => expect(getDiff).toHaveBeenLastCalledWith(COURSE_ID, V3, 'published'));
    });
  });

  describe('preview modal', () => {
    const openModal = async () => {
      renderPage(`?version=${V3}&against=previous`);
      await userEvent.click(await screen.findByRole('button', { name: 'Preview Intro text' }));
    };

    it('opens two sandboxed iframes from a component\'s Preview button', async () => {
      await openModal();
      expect(await screen.findByRole('dialog', { name: 'Preview: Intro text' })).toBeInTheDocument();
      const frames = document.querySelectorAll('iframe');
      expect(frames).toHaveLength(2);
      frames.forEach((frame) => expect(frame).toHaveAttribute('sandbox', 'allow-scripts'));
    });

    it('does not open a browser window', async () => {
      const open = jest.spyOn(window, 'open').mockImplementation(() => null);
      await openModal();
      await screen.findByRole('dialog');
      expect(open).not.toHaveBeenCalled();
      open.mockRestore();
    });

    it('closes again and removes the frames', async () => {
      await openModal();
      const buttons = await screen.findAllByRole('button', { name: 'Close' });
      await userEvent.click(buttons[buttons.length - 1]);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(document.querySelectorAll('iframe')).toHaveLength(0);
    });

    it('closes when the address moves to another comparison, and stays closed once that one loads', async () => {
      let navigate: NavigateFunction | undefined;
      const Capture = () => {
        navigate = useNavigate();
        return null;
      };
      render(<PublishHistoryComparePage />, {
        routerProps: { initialEntries: [`/compare?version=${V3}&against=previous`] },
        extraWrapper: ({ children }) => (
          <>
            {children}
            <Capture />
          </>
        ),
      });
      await userEvent.click(await screen.findByRole('button', { name: 'Preview Intro text' }));
      await screen.findByRole('dialog');
      act(() => navigate?.(`/compare?version=${V3}&against=published`));
      await waitFor(() => expect(getDiff).toHaveBeenLastCalledWith(COURSE_ID, V3, 'published'));
      await screen.findByText('1 changed block');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('has no Preview button on a unit, subsection or section', async () => {
      getDiff.mockResolvedValue(diffResult({
        tree: [node({
          blockType: 'chapter',
          usageKey: 'chapter',
          displayName: 'Week 1',
          children: [node({ blockType: 'vertical', usageKey: 'unit', displayName: 'Unit 1', children: [node()] })],
        })],
      }));
      renderPage(`?version=${V3}&against=previous`);
      await screen.findByText('Week 1');
      expect(screen.getAllByRole('button', { name: /^Preview / })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Preview Intro text' })).toBeInTheDocument();
    });
  });

  describe('invalid against', () => {
    it('shows its own message, not the generic one, and offers the dropdown again', async () => {
      getDiff.mockRejectedValue(httpError(400, { against: ['Enter a version id, "published" or "draft".'] }));
      renderPage(`?version=${V3}&against=nonsense`);
      expect(await screen.findByText(/This page address names an invalid version/)).toBeInTheDocument();
      expect(screen.queryByText('The comparison could not be loaded. Try again.')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Compare' })).toBeEnabled();
    });
  });

  describe('an empty against in the address', () => {
    it('is no choice yet: Previous Version in the dropdown and no request', async () => {
      renderPage(`?version=${V3}&against=`);
      await listLoaded();
      expect(toggle()).toHaveTextContent('Previous Version');
      expect(getDiff).not.toHaveBeenCalled();
    });
  });

  describe('against=draft in the address', () => {
    it('falls back to Previous Version in the dropdown and never asks the API for draft', async () => {
      renderPage(`?version=${V3}&against=draft`);
      await screen.findByText('1 changed block');
      expect(toggle()).toHaveTextContent('Previous Version');
      expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, 'previous');
      expect(getDiff).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'draft');
    });

    it('does not offer Current Draft when opened from a draft address', async () => {
      renderPage(`?version=${V3}&against=draft`);
      await screen.findByText('1 changed block');
      await userEvent.click(toggle());
      expect(screen.queryByRole('button', { name: 'Current Draft' })).not.toBeInTheDocument();
    });

    it('falls back again when Back returns to a draft address', async () => {
      renderWithNav(`?version=${V3}&against=draft`);
      await waitFor(() => expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, 'previous'));
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Current Published Version' }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenLastCalledWith(COURSE_ID, V3, 'published'));
      await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
      await waitFor(() => expect(location()).toBe(`/compare?version=${V3}&against=draft`));
      await waitFor(() => expect(toggle()).toHaveTextContent('Previous Version'));
      expect(await screen.findByText('1 changed block')).toBeInTheDocument();
      expect(getDiff).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'draft');
    });
  });

  describe('Title Case and labelled columns', () => {
    it('sets the document title to Compare Versions', async () => {
      renderPage();
      await waitFor(() => expect(document.title).toContain('Compare Versions'));
      expect(document.title).not.toContain('Compare versions');
    });

    it('names the two column regions', async () => {
      renderPage();
      expect(await screen.findByRole('region', { name: 'Selected Version' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Compare With' })).toBeInTheDocument();
    });

    it('labels the dropdown "Compare With"', async () => {
      renderPage();
      expect(toggle()).toHaveAccessibleName(/^Compare With/);
    });
  });

  describe('side-by-side result', () => {
    const changed = diffResult({ tree: [node({ fields: [field()] })] });

    it('renders the block as two cards with the selected newer version on the left', async () => {
      getDiff.mockResolvedValue(changed);
      renderPage(`?version=${V3}&against=previous`);
      const left = await screen.findByRole('group', { name: 'Intro text, newer version' });
      const right = screen.getByRole('group', { name: 'Intro text, older version' });
      expect(left.compareDocumentPosition(right)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders the selected older version on the left', async () => {
      getDiff.mockResolvedValue(changed);
      renderPage(`?version=${V2}&against=published`);
      const left = await screen.findByRole('group', { name: 'Intro text, older version' });
      const right = screen.getByRole('group', { name: 'Intro text, newer version' });
      expect(left.compareDocumentPosition(right)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('shows the placeholder on the older side of an added block', async () => {
      getDiff.mockResolvedValue(diffResult({ tree: [node({ change: 'ADDED' })] }));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByRole('group', { name: 'Intro text, older version' })).toHaveTextContent(
        'Not in this version',
      );
    });
  });
});
