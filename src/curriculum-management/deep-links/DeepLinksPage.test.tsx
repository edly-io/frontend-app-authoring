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
  rawCourseGroups,
  rawCurriculums,
  rawDeepLinks,
  rawDeepLinksConfig,
} from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import OutletHarness from '../__mocks__/OutletHarness';
import DeepLinksPage from './DeepLinksPage';

jest.mock('./DeepLinkForm', () => ({
  __esModule: true,
  default: ({ link, onClose, onCancel }: {
    link?: { uuid: string; };
    onClose: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="deep-link-form">
      {link ? `edit:${link.uuid}` : 'new'}
      <button type="button" onClick={onClose}>close form</button>
      <button type="button" onClick={onCancel}>cancel form</button>
    </div>
  ),
}));

const setup = (links = rawDeepLinks, linksStatus = 200) => {
  const mocks = initializeMocks();
  mocks.axiosMock.onGet(apiUrls.deepLinksConfig()).reply(200, rawDeepLinksConfig());
  mocks.axiosMock.onGet(apiUrls.deepLinksPage(1)).reply(linksStatus, page(links));
  mocks.axiosMock.onGet(apiUrls.courseGroupsPage(1)).reply(200, page(rawCourseGroups));
  mocks.axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
  render(
    <Routes>
      <Route element={<OutletHarness />}>
        <Route path="*" element={<DeepLinksPage />} />
      </Route>
    </Routes>,
  );
  return mocks;
};

describe('<DeepLinksPage />', () => {
  it('shows the empty state and opens the create form from it', async () => {
    setup([]);
    expect(await screen.findByText('You haven\'t created any deep links yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New deep link' }));
    expect(screen.getByTestId('deep-link-form')).toHaveTextContent('new');
  });

  it('lists the links collapsed with their app links, and opens the edit form over the list', async () => {
    setup();
    expect(await screen.findByRole('button', { name: /^lisbon onboarding/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getAllByTestId('deep-link-card')).toHaveLength(2);
    expect(screen.getAllByTestId('app-link')[1]).toHaveTextContent('uber://learn?target=optional');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Lisbon onboarding' }));
    expect(screen.getByTestId('deep-link-form')).toHaveTextContent('edit:link-1');
    await userEvent.click(screen.getByRole('button', { name: 'cancel form' }));
    expect(screen.queryByTestId('deep-link-form')).not.toBeInTheDocument();
  });

  it('puts the launch string reference in the help sidebar', async () => {
    setup();
    await screen.findAllByTestId('deep-link-card');
    const fields = within(screen.getByTestId('harness-sidebar')).getByTestId('launch-fields');
    expect(within(fields).getByText('external_id')).toBeInTheDocument();
    expect(within(fields).getByText('Unix seconds, at most 300 seconds ahead.')).toBeInTheDocument();
    expect(screen.getByText(/signs these fields into the launch string \(uber-launch-v3\)/)).toBeInTheDocument();
  });

  it('shows the connection error alert, and no list, when the links fail to load', async () => {
    // A 4xx: a 5xx is retried with a backoff that outlasts the test.
    setup(rawDeepLinks, 404);
    expect(await screen.findByTestId('connectionErrorAlert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'New deep link' })).not.toBeInTheDocument());
  });
});
