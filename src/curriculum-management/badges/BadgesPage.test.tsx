import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';
import {
  page,
  rawBadges,
  rawCourseBadge,
  rawStatus,
} from '../__mocks__/fixtures';
import OutletHarness from '../__mocks__/OutletHarness';
import { apiUrls } from '../data/api';
import BadgesPage from './BadgesPage';

jest.mock('./BadgeForm', () => ({
  __esModule: true,
  default: ({ badge, onDirtyChange }: { badge?: { uuid: string; }; onDirtyChange: (dirty: boolean) => void; }) => (
    <div data-testid="badge-form">
      {badge ? `edit:${badge.uuid}` : 'new'}
      <button type="button" onClick={() => onDirtyChange(true)}>report dirty</button>
    </div>
  ),
}));

const renderPage = () =>
  render(
    <Routes>
      <Route element={<OutletHarness />}>
        <Route path="*" element={<BadgesPage />} />
      </Route>
    </Routes>,
  );

const cardFor = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('[data-testid="badge-card"]') as HTMLElement;

// Rows start collapsed; the toggle's name includes the badge title.
const expand = (user: ReturnType<typeof userEvent.setup>, title: string) =>
  user.click(within(cardFor(title)).getByRole('button', { name: new RegExp(`^${title}`, 'i') }));

describe('<BadgesPage />', () => {
  it('lists badges as collapsed rows with their IDs; expanding shows the "Linked to" chips', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('4 badges')).toBeInTheDocument();
    const roadReady = cardFor('Road ready');
    expect(within(roadReady).getByText(`ID: ${rawBadges[0].uuid}`)).toBeInTheDocument();
    expect(within(roadReady).queryByRole('link')).not.toBeInTheDocument();
    expect(within(cardFor('Holiday rush ready')).getByText('Not linked')).toBeInTheDocument();
    await expand(user, 'Road ready');
    expect(within(roadReady).getByRole('link', { name: 'New driver essentials · Complete' })).toHaveAttribute(
      'href',
      '/curriculum-management',
    );
    expect(within(roadReady).getByRole('img', { name: 'Road ready' })).toHaveAttribute('src', rawBadges[0].image_url);
    await expand(user, 'Holiday rush ready');
    expect(within(cardFor('Holiday rush ready')).getByText('Not linked to a curriculum')).toBeInTheDocument();
  });

  it('expands the only badge left by default', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges.slice(3)));
    renderPage();
    await screen.findByText('1 badge');
    expect(screen.getByText('Not linked to a curriculum')).toBeInTheDocument();
  });

  it('opens the create form from the button below the list', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    renderPage();
    await screen.findByText('4 badges');
    await userEvent.click(screen.getByRole('button', { name: 'New badge' }));
    expect(screen.getByTestId('badge-form')).toHaveTextContent('new');
  });

  it('filters by title or UUID on the client', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    renderPage();
    await screen.findByText('4 badges');
    await userEvent.type(screen.getByRole('searchbox'), 'holiday');
    expect(screen.getByText('1 badge')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Road ready' })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), '5d21c8e7');
    expect(screen.getByRole('heading', { name: 'Essentials complete' })).toBeInTheDocument();
    expect(axiosMock.history.get.filter((r) => r.url?.includes('/badges/'))).toHaveLength(1);
  });

  it('deletes an unlinked badge after a confirmation', async () => {
    const { axiosMock, mockShowToast } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    axiosMock.onDelete(apiUrls.badge(rawBadges[3].uuid)).reply(204);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('4 badges');
    await user.click(within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Delete Holiday rush ready' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(axiosMock.history.delete).toHaveLength(1);
    expect(mockShowToast).toHaveBeenCalledWith('Badge deleted');
  });

  it('deletes a linked badge after a warning that names its curriculums', async () => {
    const { axiosMock, mockShowToast, queryClient } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    axiosMock.onDelete(apiUrls.badge(rawBadges[0].uuid)).reply(204);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('4 badges');
    const deleteButton = within(cardFor('Road ready')).getByRole('button', { name: 'Delete Road ready' });
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('This badge will be removed from 1 curriculum:')).toBeInTheDocument();
    expect(within(dialog).getByText('New driver essentials · Complete')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(axiosMock.history.delete).toHaveLength(1);
    expect(mockShowToast).toHaveBeenCalledWith('Badge deleted');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['curriculumManagement', 'curriculums'] });
  });

  it('explains a 409 when learners have earned the badge', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    axiosMock.onDelete(apiUrls.badge(rawBadges[3].uuid)).reply(409, {
      detail: 'This badge has been awarded to learners and can\'t be deleted.',
      award_count: 1,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('4 badges');
    await user.click(within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Delete Holiday rush ready' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('1 learner has earned this badge, so it can\'t be deleted.')).toBeInTheDocument();
  });

  it('an unlinked curriculum badge gets the plain confirmation', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('4 badges');
    await user.click(within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Delete Holiday rush ready' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/will be removed from/)).not.toBeInTheDocument();
  });

  it('shows the kind; a course badge lists its courses instead of "Linked to"', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([...rawBadges, rawCourseBadge]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('5 badges');
    expect(within(cardFor('Road ready')).getByText('Curriculum badge')).toBeInTheDocument();
    const airport = cardFor('Airport pro');
    expect(within(airport).getByText('Course badge')).toBeInTheDocument();
    expect(within(airport).getByText('2 courses')).toBeInTheDocument();
    await expand(user, 'Airport pro');
    expect(within(airport).getByText('Awarded for completing')).toBeInTheDocument();
    expect(within(airport).getByText('Airport pickups')).toBeInTheDocument();
    expect(within(airport).getByText('Course not found')).toBeInTheDocument();
    expect(within(airport).queryByText('Linked to')).not.toBeInTheDocument();
  });

  it('a course badge with no courses says so', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([{ ...rawCourseBadge, courses: [] }]));
    renderPage();
    await screen.findByText('1 badge');
    expect(screen.getByText('No courses yet')).toBeInTheDocument(); // the only card starts expanded
  });

  it('warns that deleting a course badge removes it from its courses', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([...rawBadges, rawCourseBadge]));
    axiosMock.onDelete(apiUrls.badge(rawCourseBadge.uuid)).reply(204);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('5 badges');
    await user.click(within(cardFor('Airport pro')).getByRole('button', { name: 'Delete Airport pro' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('This badge will be removed from 2 courses:')).toBeInTheDocument();
    expect(within(dialog).getByText('Airport pickups')).toBeInTheDocument();
    expect(within(dialog).getByText('course-v1:Uber+DRV202+2026_Q4')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(axiosMock.history.delete).toHaveLength(1);
  });

  it('shows a generic alert when delete fails', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    axiosMock.onDelete(apiUrls.badge(rawBadges[3].uuid)).reply(500);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('4 badges');
    await user.click(within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Delete Holiday rush ready' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('copies the UUID and confirms with a toast', async () => {
    const { axiosMock, mockShowToast } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    // navigator.clipboard is getter-only here; userEvent.setup() installs a stub clipboard, so spy on it.
    const user = userEvent.setup();
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');
    renderPage();
    await screen.findByText('4 badges');
    await user.click(within(cardFor('Road ready')).getByRole('button', { name: 'Copy badge ID' }));
    expect(writeText).toHaveBeenCalledWith(rawBadges[0].uuid);
    expect(mockShowToast).toHaveBeenCalledWith('Badge ID copied');
  });

  it('shows an error toast, not an unhandled rejection, when copying the UUID fails', async () => {
    const { axiosMock, mockShowToast } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    const user = userEvent.setup();
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderPage();
    await screen.findByText('4 badges');
    await user.click(within(cardFor('Road ready')).getByRole('button', { name: 'Copy badge ID' }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Could not copy the badge ID'));
    expect(mockShowToast).not.toHaveBeenCalledWith('Badge ID copied');
  });

  it('shows the empty state and opens the create form', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([]));
    renderPage();
    expect(await screen.findByText('You haven\'t created any badges yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New badge' }));
    expect(screen.getByTestId('badge-form')).toHaveTextContent('new');
  });

  it('passes the layout\'s setFormDirty to the form it opens', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    renderPage();
    await screen.findByText('4 badges');
    expect(screen.getByTestId('harness-form-dirty')).toHaveTextContent('false');
    await userEvent.click(
      within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Edit Holiday rush ready' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'report dirty' }));
    expect(screen.getByTestId('harness-form-dirty')).toHaveTextContent('true');
  });

  it('opens the edit form over the list, leaving the card in place', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    renderPage();
    await screen.findByText('4 badges');
    await userEvent.click(
      within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Edit Holiday rush ready' }),
    );
    expect(screen.getByTestId('badge-form')).toHaveTextContent(`edit:${rawBadges[3].uuid}`);
    expect(cardFor('Holiday rush ready')).toBeInTheDocument();
  });

  it('does not tie the edit form to the search: filtering never closes it', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
    renderPage();
    await screen.findByText('4 badges');
    await userEvent.type(screen.getByRole('searchbox'), 'holiday');
    await userEvent.click(
      within(cardFor('Holiday rush ready')).getByRole('button', { name: 'Edit Holiday rush ready' }),
    );
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz-no-match');
    expect(screen.getByTestId('badge-form')).toHaveTextContent(`edit:${rawBadges[3].uuid}`);
  });
});
