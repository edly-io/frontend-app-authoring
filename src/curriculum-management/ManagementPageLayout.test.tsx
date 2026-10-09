import {
  Link,
  Route,
  Routes,
  useOutletContext,
} from 'react-router-dom';
import {
  act,
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';
import userEvent from '@testing-library/user-event';
import { page, rawStatus } from './__mocks__/fixtures';
import { getStudioHomeApiUrl } from '@src/studio-home/data/api';
import { apiUrls } from './data/api';
import ManagementPageLayout from './ManagementPageLayout';
import type { CurriculumManagementOutletContext } from './types';

jest.mock('../header', () => jest.fn(() => <div data-testid="mock-header" />));
jest.mock('@edx/frontend-component-footer', () => ({
  StudioFooterSlot: jest.fn(() => <div data-testid="mock-footer" />),
}));
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useBlocker: jest.fn(() => ({ state: 'unblocked', proceed: jest.fn(), reset: jest.fn() })),
}));

const CURRICULUMS = '/curriculum-management';
const BADGES = '/curriculum-management/badges';

/** Every `formTarget` a ContextProbe has rendered with, in order, per testId. */
const rendered: Record<string, string[]> = {};

/** Child page that exposes the outlet context so the test can drive it. */
const ContextProbe = ({ testId, otherPath }: { testId: string; otherPath: string; }) => {
  const { formTarget, setFormTarget, setFormDirty } = useOutletContext<CurriculumManagementOutletContext>();
  (rendered[testId] ??= []).push(String(formTarget));
  return (
    <div data-testid={testId}>
      <span data-testid="form-target">{String(formTarget)}</span>
      <button type="button" onClick={() => setFormDirty(true)}>make dirty</button>
      <button type="button" onClick={() => setFormTarget('uuid-2')}>edit other</button>
      <Link to={otherPath}>go to other page</Link>
    </div>
  );
};

const renderLayout = (path = CURRICULUMS) =>
  render(
    <Routes>
      <Route path={CURRICULUMS} element={<ManagementPageLayout />}>
        <Route index element={<ContextProbe testId="curriculums-page" otherPath={BADGES} />} />
        <Route path="badges" element={<ContextProbe testId="badges-page" otherPath={CURRICULUMS} />} />
      </Route>
    </Routes>,
    { routerProps: { initialEntries: [path] } },
  );

describe('<ManagementPageLayout />', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  beforeEach(() => {
    Object.keys(rendered).forEach((key) => delete rendered[key]);
    ({ axiosMock } = initializeMocks());
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page([]));
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([]));
  });

  it('requests status, curriculums and badges in parallel', async () => {
    axiosMock.onGet(apiUrls.status()).reply(() => new Promise(() => {}));
    renderLayout();
    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => {
      const urls = axiosMock.history.get.map((r) => r.url);
      expect(urls).toEqual(
        expect.arrayContaining([apiUrls.status(), apiUrls.curriculumsPage(1), apiUrls.badgesPage(1)]),
      );
    });
  });

  it.each([CURRICULUMS, BADGES])('%s: NotFoundAlert, no tabs and no New button when the flag is off', async (path) => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus(false));
    renderLayout(path);
    expect(await screen.findByTestId('notFoundAlert')).toBeInTheDocument();
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^new /i })).not.toBeInTheDocument();
  });

  it.each([
    [CURRICULUMS, 'Curriculum', 'Badges'],
    [BADGES, 'Badges', 'Curriculum'],
  ])('%s: both tabs link to their paths and only "%s" is current', async (path, current, other) => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    renderLayout(path);
    const nav = await screen.findByRole('navigation', { name: 'Curriculum management sections' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Curriculum' })).toHaveAttribute('href', CURRICULUMS);
    expect(screen.getByRole('link', { name: 'Badges' })).toHaveAttribute('href', BADGES);
    expect(screen.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: other })).not.toHaveAttribute('aria-current');
  });

  it('Curriculum tab: page title, New curriculum and the curriculum help', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    renderLayout();
    expect(await screen.findByTestId('curriculums-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Curriculum Management' })).toBeInTheDocument();
    expect(screen.getByText('About curriculums')).toBeInTheDocument();
    expect(screen.queryByText('Course badges')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New curriculum' }));
    expect(screen.getByTestId('form-target')).toHaveTextContent('new');
  });

  it('Badges tab: same page title, New badge and the badge help', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    renderLayout(BADGES);
    expect(await screen.findByTestId('badges-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Curriculum Management' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New badge' })).toBeInTheDocument();
    expect(screen.getByText('Course badges')).toBeInTheDocument();
    expect(screen.queryByText('About curriculums')).not.toBeInTheDocument();
  });

  it('shows ConnectionErrorAlert, and no New button, when either list fails', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    axiosMock.onGet(apiUrls.badgesPage(1)).reply(400);
    renderLayout();
    expect(await screen.findByTestId('connectionErrorAlert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^new /i })).not.toBeInTheDocument();
  });

  it('shows ConnectionErrorAlert, not NotFoundAlert, when the status call keeps failing with a 5xx', async () => {
    jest.useFakeTimers();
    try {
      axiosMock.onGet(apiUrls.status()).reply(502);
      renderLayout();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10000);
      });
      expect(await screen.findByTestId('connectionErrorAlert')).toBeInTheDocument();
      expect(screen.queryByTestId('notFoundAlert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^new /i })).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('asks before switching to another form while the open one is dirty', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId('curriculums-page');
    await user.click(screen.getByRole('button', { name: 'New curriculum' }));
    await user.click(screen.getByRole('button', { name: 'make dirty' }));
    await user.click(screen.getByRole('button', { name: 'edit other' }));
    expect(screen.getByTestId('form-target')).toHaveTextContent('new');
    expect(await screen.findByText('You have unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByTestId('form-target')).toHaveTextContent('new');
    await user.click(screen.getByRole('button', { name: 'edit other' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(screen.getByTestId('form-target')).toHaveTextContent('uuid-2');
  });

  it('never renders the other tab with the previous tab\'s form target, not even for one render', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId('curriculums-page');
    await user.click(screen.getByRole('button', { name: 'New curriculum' }));
    expect(screen.getByTestId('form-target')).toHaveTextContent('new');
    await user.click(screen.getByRole('link', { name: 'go to other page' }));
    expect(await screen.findByTestId('badges-page')).toBeInTheDocument();
    expect(rendered['badges-page']).toEqual(expect.arrayContaining(['null']));
    expect(rendered['badges-page']).not.toContain('new');
  });
  it('shows the Studio home tabs, with Curriculum Management active on both sub-tabs', async () => {
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    axiosMock.onGet(getStudioHomeApiUrl()).reply(200, { libraries_v1_enabled: true, libraries_v2_enabled: true });
    renderLayout(BADGES);
    const homeNav = await screen.findByRole('navigation', { name: 'Studio home sections' });
    expect(await within(homeNav).findByRole('link', { name: 'Legacy Libraries' })).toHaveAttribute(
      'href',
      '/libraries-v1',
    );
    expect(within(homeNav).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/home');
    expect(within(homeNav).getByRole('link', { name: 'Libraries' })).toHaveAttribute('href', '/libraries');
    expect(within(homeNav).getByRole('link', { name: 'Curriculum Management' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
