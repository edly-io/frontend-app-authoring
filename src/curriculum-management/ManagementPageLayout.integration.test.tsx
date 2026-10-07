/**
 * Real ManagementPageLayout + real pages + real forms, inside a real data router so that
 * `useBlocker` (and its proceed/reset) is exercised rather than mocked.
 */
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppProvider } from '@edx/frontend-platform/react';
import { QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import {
  act,
  render,
  screen,
  within,
} from '@testing-library/react';
import { initializeMocks } from '@src/testUtils';
import { ToastContext } from '../generic/toast-context';
import {
  page,
  rawBadges,
  rawCurriculums,
  rawStatus,
} from './__mocks__/fixtures';
import { apiUrls } from './data/api';
import ManagementPageLayout from './ManagementPageLayout';
import CurriculumsPage from './curriculums/CurriculumsPage';
import BadgesPage from './badges/BadgesPage';

jest.mock('../header', () => jest.fn(() => <div data-testid="mock-header" />));
jest.mock('@edx/frontend-component-footer', () => ({
  StudioFooterSlot: jest.fn(() => <div data-testid="mock-footer" />),
}));

// jsdom has no fetch `Request`, which react-router's data router builds for every navigation.
// None of these routes has a loader or action, so a minimal stand-in is enough.
class RequestStub {
  url: string;

  method: string;

  signal?: AbortSignal;

  constructor(url: string | { url: string; }, init: { method?: string; signal?: AbortSignal; } = {}) {
    this.url = typeof url === 'string' ? url : url.url;
    this.method = init.method ?? 'GET';
    this.signal = init.signal;
  }
}

beforeAll(() => {
  Object.defineProperty(global, 'Request', { value: RequestStub, configurable: true, writable: true });
});

const toastContext = {
  showToast: jest.fn(),
  closeToast: jest.fn(),
  toastAction: undefined,
  toastMessage: null,
};

const renderApp = (mocks: ReturnType<typeof initializeMocks>, path = '/curriculum-management') => {
  const router = createMemoryRouter(
    [
      {
        path: '/curriculum-management',
        element: <ManagementPageLayout />,
        children: [
          { index: true, element: <CurriculumsPage /> },
          { path: 'badges', element: <BadgesPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <AppProvider store={mocks.reduxStore} wrapWithRouter={false}>
      <IntlProvider locale="en" messages={{}}>
        <QueryClientProvider client={mocks.queryClient}>
          <ToastContext.Provider value={toastContext}>
            <RouterProvider router={router} />
          </ToastContext.Provider>
        </QueryClientProvider>
      </IntlProvider>
    </AppProvider>,
  );
  return router;
};

/** The SubHeader action; the list also has an outline "New curriculum" button under it. */
const newCurriculumButton = async () => (await screen.findAllByRole('button', { name: 'New curriculum' }))[0];

const PROMPT = 'You have unsaved changes';

describe('<ManagementPageLayout /> with real pages and forms', () => {
  let mocks: ReturnType<typeof initializeMocks>;

  beforeEach(() => {
    mocks = initializeMocks();
    mocks.axiosMock.onGet(apiUrls.status()).reply(200, rawStatus());
    mocks.axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    mocks.axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page(rawBadges));
  });

  it('closing an untouched modal does not prompt', async () => {
    const user = userEvent.setup();
    renderApp(mocks);
    await user.click(await newCurriculumButton());
    expect(await screen.findByRole('dialog', { name: 'New curriculum' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'New curriculum' })).not.toBeInTheDocument();
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it('closing a dirty modal prompts: Keep editing keeps the text, Discard closes the modal', async () => {
    const user = userEvent.setup();
    renderApp(mocks);
    await user.click(await newCurriculumButton());
    await user.type(await screen.findByLabelText('Title'), 'Draft title');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Draft title');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('dialog', { name: 'New curriculum' })).not.toBeInTheDocument();
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it('closing a dirty badge modal prompts too', async () => {
    const user = userEvent.setup();
    renderApp(mocks, '/curriculum-management/badges');
    await screen.findByText('4 badges');
    const card = screen.getByRole('heading', { name: 'Holiday rush ready' }).closest('[data-testid="badge-card"]');
    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Edit Holiday rush ready' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit badge' });
    await user.type(within(dialog).getByLabelText(/^Title/), ' edited');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('dialog', { name: 'Edit badge' })).not.toBeInTheDocument();
  });

  it('leaving the page from a dirty modal is blocked; discarding navigates and closes it', async () => {
    const user = userEvent.setup();
    const router = renderApp(mocks);
    await user.click(await newCurriculumButton());
    await user.type(await screen.findByLabelText('Title'), 'Draft title');

    act(() => {
      router.navigate('/curriculum-management/badges');
    });
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Draft title');
    expect(router.state.location.pathname).toEqual('/curriculum-management');

    act(() => {
      router.navigate('/curriculum-management/badges');
    });
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByText('4 badges')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The form is gone, so nothing is left to protect: going back is not blocked.
    act(() => {
      router.navigate('/curriculum-management');
    });
    expect(await screen.findByText('New driver essentials')).toBeInTheDocument();
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it('does not open the other page\'s modal with a stale "new" form target', async () => {
    const user = userEvent.setup();
    const router = renderApp(mocks);
    // An untouched (so not dirty) create form, then leave.
    await user.click(await newCurriculumButton());
    act(() => {
      router.navigate('/curriculum-management/badges');
    });
    await screen.findByText('4 badges');
    expect(screen.queryByTestId('badge-form')).not.toBeInTheDocument();
    act(() => {
      router.navigate('/curriculum-management');
    });
    await screen.findByText('New driver essentials');
    expect(screen.queryByTestId('curriculum-form')).not.toBeInTheDocument();
  });

  it('switching tabs with a dirty modal is blocked; clicking the Badges tab after discarding opens it', async () => {
    const user = userEvent.setup();
    const router = renderApp(mocks);
    await user.click(await newCurriculumButton());
    await user.type(await screen.findByLabelText('Title'), 'Draft title');
    // The modal sits over the page; leave through the router as the header would.
    act(() => {
      router.navigate('/curriculum-management/badges');
    });
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(router.state.location.pathname).toEqual('/curriculum-management');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await user.click(screen.getByRole('link', { name: 'Badges' }));
    expect(await screen.findByText('4 badges')).toBeInTheDocument();
    expect(router.state.location.pathname).toEqual('/curriculum-management/badges');
  });
});
