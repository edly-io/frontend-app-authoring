import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import * as api from './data/api';
import PublishHistoryPage from './PublishHistoryPage';
import {
  COURSE_ID,
  httpError,
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

const page = (results, nextAfter: string | null = null, historyEnds: 'pruned' | 'course_created' | null = null) => ({
  results,
  nextAfter,
  historyEnds,
});

describe('<PublishHistoryPage />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('shows a spinner while loading', () => {
    getVersions.mockReturnValue(new Promise(() => {}));
    render(<PublishHistoryPage />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('This course has not been published yet.')).not.toBeInTheDocument();
  });

  it('lists the versions with publisher and short version id', async () => {
    getVersions.mockResolvedValue(page([
      version(V3, { isCurrent: true, publishedBy: { id: 7, username: 'writer' } }),
      version(V2, { publishedBy: { id: 8, username: 'editor' } }),
    ]));
    render(<PublishHistoryPage />);
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2
    expect(within(rows[1]).getByText('writer')).toBeInTheDocument();
    expect(within(rows[1]).getByText(V3.slice(0, 8))).toBeInTheDocument();
    expect(within(rows[2]).getByText('editor')).toBeInTheDocument();
  });

  it('asks for the first page of this course', async () => {
    getVersions.mockResolvedValue(page([version(V3)]));
    render(<PublishHistoryPage />);
    await screen.findByRole('table');
    expect(getVersions).toHaveBeenCalledWith(COURSE_ID, undefined);
  });

  it('marks only the current version', async () => {
    getVersions.mockResolvedValue(page([version(V3, { isCurrent: true }), version(V2)]));
    render(<PublishHistoryPage />);
    await screen.findByRole('table');
    expect(screen.getAllByText('Current')).toHaveLength(1);
    expect(within(screen.getAllByRole('row')[1]).getByText('Current')).toBeInTheDocument();
  });

  it('shows Unknown for an unknown publisher and time', async () => {
    getVersions.mockResolvedValue(page([version(V3, { publishedBy: null, publishedAt: null })]));
    render(<PublishHistoryPage />);
    await screen.findByRole('table');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare Unknown time' })).toBeInTheDocument();
  });

  it('links each row to the compare page for that version', async () => {
    getVersions.mockResolvedValue(page([version(V3), version(V2)]));
    render(<PublishHistoryPage />);
    const links = await screen.findAllByRole('link', { name: /^Compare / });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `/course/${COURSE_ID}/publish_history/compare?version=${V3}`,
      `/course/${COURSE_ID}/publish_history/compare?version=${V2}`,
    ]);
  });

  it('links back to the course outline', async () => {
    getVersions.mockResolvedValue(page([version(V3)]));
    render(<PublishHistoryPage />);
    expect(await screen.findByRole('link', { name: 'Course outline' })).toHaveAttribute('href', `/course/${COURSE_ID}`);
  });

  it('shows the empty state', async () => {
    getVersions.mockResolvedValue(page([]));
    render(<PublishHistoryPage />);
    expect(await screen.findByText('This course has not been published yet.')).toBeInTheDocument();
  });

  it('has no Load older button on the last page', async () => {
    getVersions.mockResolvedValue(page([version(V3)]));
    render(<PublishHistoryPage />);
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Load older versions' })).not.toBeInTheDocument();
  });

  it('loads the next page with the cursor and keeps the earlier rows', async () => {
    getVersions
      .mockResolvedValueOnce(page([version(V3, { publishedBy: { id: 1, username: 'first' } })], V3))
      .mockResolvedValueOnce(page([version(V2, { publishedBy: { id: 2, username: 'second' } })]));
    render(<PublishHistoryPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load older versions' }));
    expect(await screen.findByText('second')).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(getVersions).toHaveBeenLastCalledWith(COURSE_ID, V3);
    expect(screen.queryByRole('button', { name: 'Load older versions' })).not.toBeInTheDocument();
  });

  it('says the history ends at course creation', async () => {
    getVersions.mockResolvedValue(page([version(V1)], null, 'course_created'));
    render(<PublishHistoryPage />);
    expect(await screen.findByText(/this is the version the course was created with/)).toBeInTheDocument();
  });

  it('says the history ends where older versions were removed', async () => {
    getVersions.mockResolvedValue(page([version(V3)], null, 'pruned'));
    render(<PublishHistoryPage />);
    expect(await screen.findByText(/older versions were removed/)).toBeInTheDocument();
  });

  it('shows no end note while more pages exist', async () => {
    getVersions.mockResolvedValue(page([version(V3)], V3, null));
    render(<PublishHistoryPage />);
    await screen.findByRole('table');
    expect(screen.queryByText(/The history ends here/)).not.toBeInTheDocument();
  });

  it('shows the permission message for a 403', async () => {
    getVersions.mockRejectedValue(httpError(403));
    render(<PublishHistoryPage />);
    expect(await screen.findByText(/not available for this course or your account/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the generic error for another failure', async () => {
    getVersions.mockRejectedValue(httpError(400));
    render(<PublishHistoryPage />);
    expect(await screen.findByText('The publish history could not be loaded. Try again later.')).toBeInTheDocument();
  });

  it('sets the document title', async () => {
    getVersions.mockResolvedValue(page([version(V3)]));
    render(<PublishHistoryPage />);
    await waitFor(() => expect(document.title).toContain('Publish history'));
  });
});
