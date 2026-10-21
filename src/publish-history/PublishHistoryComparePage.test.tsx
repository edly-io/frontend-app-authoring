import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
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

const location = () => screen.getByTestId('location').textContent;
const toggle = () => screen.getByRole('button', { name: /^Compare with/ });

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
      expect(toggle()).toHaveTextContent('Previous version');
      await waitFor(() => expect(getVersions).toHaveBeenCalled());
      expect(getDiff).not.toHaveBeenCalled();
    });

    it('offers previous, published, draft and the other loaded versions but not the version itself', async () => {
      renderPage();
      await screen.findByText(/Version published/);
      await userEvent.click(toggle());
      const items = (await screen.findAllByRole('button')).map((button) => button.textContent);
      expect(items).toEqual(expect.arrayContaining([
        'Previous version',
        'Current published version',
        'Current draft',
      ]));
      expect(items.filter((text) => text?.endsWith('by older'))).toHaveLength(1);
      expect(items.filter((text) => text?.endsWith('by writer'))).toHaveLength(0);
    });

    it('names the version being compared once the list is loaded', async () => {
      renderPage();
      expect(await screen.findByText(/Version published/)).toBeInTheDocument();
    });

    it('links back to the publish history list', async () => {
      renderPage();
      expect(await screen.findByRole('link', { name: 'Publish history' }))
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

    it.each([
      ['Current published version', 'published'],
      ['Current draft', 'draft'],
    ])('compares with "%s"', async (label, against) => {
      renderPage();
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: label }));
      expect(getDiff).not.toHaveBeenCalled(); // choosing alone does not fetch
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, against));
      expect(location()).toBe(`/compare?version=${V3}&against=${against}`);
    });

    it('compares with an older version by its id', async () => {
      renderPage();
      await screen.findByText(/Version published/);
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: /by older$/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, V2));
      expect(location()).toBe(`/compare?version=${V3}&against=${V2}`);
    });

    it('keeps the version and replaces an earlier against', async () => {
      renderPage(`?version=${V3}&against=published`);
      await userEvent.click(toggle());
      await userEvent.click(await screen.findByRole('button', { name: 'Current draft' }));
      await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
      await waitFor(() => expect(location()).toBe(`/compare?version=${V3}&against=draft`));
    });
  });

  describe('opening a URL with against', () => {
    it('renders the comparison directly and shows the chosen option', async () => {
      renderPage(`?version=${V3}&against=published`);
      expect(await screen.findByText('1 changed block')).toBeInTheDocument();
      expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, 'published');
      expect(toggle()).toHaveTextContent('Current published version');
    });

    it('passes a version id as against', async () => {
      renderPage(`?version=${V3}&against=${V1}`);
      await screen.findByText('1 changed block');
      expect(getDiff).toHaveBeenCalledWith(COURSE_ID, V3, V1);
    });

    it('shows a short id for an against version that is not loaded', async () => {
      renderPage(`?version=${V3}&against=${V1}`);
      expect(toggle()).toHaveTextContent(V1.slice(0, 8));
    });
  });

  describe('result', () => {
    it('names both sides', async () => {
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText(/^Older: version of .* by writer$/)).toBeInTheDocument();
      expect(screen.getByText(/^Newer: version of .* by editor$/)).toBeInTheDocument();
    });

    it('labels published and draft sides', async () => {
      getDiff.mockResolvedValue(diffResult({
        to: { id: V3, kind: 'draft', at: null, by: null },
        from: { id: V2, kind: 'published', at: null, by: null },
      }));
      renderPage(`?version=${V3}&against=draft`);
      expect(await screen.findByText(/^Newer: current draft, last edited Unknown time by Unknown$/))
        .toBeInTheDocument();
      expect(screen.getByText(/^Older: current published version of Unknown time by Unknown$/)).toBeInTheDocument();
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

    it('explains that the oldest version has no previous one (400 against)', async () => {
      await failWith(httpError(400, { against: ['This is the oldest version.'] }));
      expect(await screen.findByText(/This is the oldest version, so there is no previous version/))
        .toBeInTheDocument();
    });

    it('shows the permission message for a 403', async () => {
      await failWith(httpError(403));
      expect(await screen.findByText(/not available for this course or your account/)).toBeInTheDocument();
    });

    it('shows the generic message for another failure', async () => {
      await failWith(httpError(400, { version: ['bad'] }));
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
      await userEvent.click(await screen.findByRole('button', { name: 'Load more versions' }));
      await waitFor(() => expect(getVersions).toHaveBeenLastCalledWith(COURSE_ID, V3));
      await userEvent.click(toggle());
      expect(await screen.findByRole('button', { name: /by oldest$/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Load more versions' })).not.toBeInTheDocument();
    });

    it('has no Load more button when all versions are loaded', async () => {
      renderPage();
      await screen.findByText(/Version published/);
      expect(screen.queryByRole('button', { name: 'Load more versions' })).not.toBeInTheDocument();
    });

    it('still compares when the version list fails to load', async () => {
      getVersions.mockRejectedValue(httpError(403));
      renderPage(`?version=${V3}&against=previous`);
      expect(await screen.findByText('1 changed block')).toBeInTheDocument();
    });
  });
});
