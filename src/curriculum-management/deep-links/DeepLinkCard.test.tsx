import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  within,
} from '@src/testUtils';
import { rawDeepLinks, rawDeepLinksConfig, rawTestLink } from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type { DeepLink, DeepLinksConfig } from '../types';
import DeepLinkCard from './DeepLinkCard';

const link = camelCaseObject(rawDeepLinks[0]) as DeepLink;
const bareLink = camelCaseObject(rawDeepLinks[1]) as DeepLink;
const config = (overrides: Record<string, unknown> = {}) =>
  camelCaseObject(rawDeepLinksConfig(overrides)) as DeepLinksConfig;

const postBody = (axiosMock: ReturnType<typeof initializeMocks>['axiosMock']) =>
  JSON.parse(axiosMock.history.post[0].data);

/** Opens the card, then its collapsed test link section. */
const expandTestLink = async (user: ReturnType<typeof userEvent.setup>, title: RegExp) => {
  await user.click(screen.getByRole('button', { name: title }));
  await user.click(await screen.findByRole('button', { name: /Signed test link/ }));
};

describe('<DeepLinkCard />', () => {
  it('shows title, destination, chips and the app link; expands to what the link carries', async () => {
    initializeMocks();
    const user = userEvent.setup();
    render(<DeepLinkCard link={link} config={config()} onEdit={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Lisbon onboarding' })).toBeInTheDocument();
    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.getByText('2 learning paths')).toBeInTheDocument();
    expect(screen.getByText('2 groups')).toBeInTheDocument();
    expect(screen.getByTestId('app-link')).toHaveTextContent(
      'uber://learn?target=home&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4&path_id=new-driver-essentials%2Cgone&groups=ev-drivers%2Cporto',
    );
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByText('Enrolls in')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^lisbon onboarding/i }));
    expect(screen.getByText('Handed to Uber for the Lisbon launch.')).toBeInTheDocument();
    expect(screen.getByText('Enrolls in')).toBeInTheDocument();
    expect(screen.getByText('Getting started')).toBeInTheDocument();
    expect(screen.getByText('New driver essentials')).toBeInTheDocument();
    expect(screen.getByText('Learning path not found')).toBeInTheDocument();
    expect(screen.getByText('EV drivers')).toBeInTheDocument();
    expect(screen.getByText('Course group not found')).toBeInTheDocument();
    // A home link opens no path: no "Opens" badge.
    expect(screen.queryByText('Opens')).not.toBeInTheDocument();
  });

  it('says what a bare link leaves out, and marks the path a path link opens', () => {
    initializeMocks();
    render(<DeepLinkCard link={bareLink} config={config()} defaultExpanded onEdit={jest.fn()} />);
    // The destination: the chip in the header and the row in the details.
    expect(screen.getAllByText('Optional courses')).toHaveLength(2);
    // No course and no learning paths.
    expect(screen.getAllByText('None')).toHaveLength(2);
    expect(screen.getByText('None: the driver keeps their groups')).toBeInTheDocument();

    render(<DeepLinkCard link={{ ...link, target: 'path' }} config={config()} defaultExpanded onEdit={jest.fn()} />);
    expect(screen.getByText('Opens')).toBeInTheDocument();
  });

  it('deletes after confirming, saying Uber keeps its copy', async () => {
    const { axiosMock, mockShowToast } = initializeMocks();
    axiosMock.onDelete(apiUrls.deepLink('link-1')).reply(204);
    const user = userEvent.setup();
    render(<DeepLinkCard link={link} config={config()} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete Lisbon onboarding' }));
    expect(await screen.findByText(/Uber keeps any copy of the link/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(axiosMock.history.delete[0].url).toEqual(apiUrls.deepLink('link-1'));
    expect(mockShowToast).toHaveBeenCalledWith('Deep link deleted');
  });

  it('shows an alert when delete fails', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onDelete(apiUrls.deepLink('link-2')).reply(500);
    const user = userEvent.setup();
    render(<DeepLinkCard link={bareLink} config={config()} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete Optional courses reminder' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('mints a test link for the saved link and summarises what it does', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onPost(apiUrls.testLinks()).reply(
      201,
      rawTestLink({
        external_id: 'dev-42',
        course_id: 'course-v1:Uber+DRV101+2026_Q4',
        path_id: 'new-driver-essentials,gone',
        groups: ['ev-drivers', 'porto'],
        url: 'http://apps.local.openedx.io:2011/uber-learn/launch#x',
      }),
    );
    const user = userEvent.setup();
    render(<DeepLinkCard link={link} config={config()} onEdit={jest.fn()} />);
    await expandTestLink(user, /^lisbon onboarding/i);
    expect(screen.getByText(/works once, for 300 seconds/)).toBeInTheDocument();
    // A test link always signs in a new test driver: there is no External ID to type.
    expect(screen.queryByLabelText('External ID')).not.toBeInTheDocument();
    // The link's own groups go into the test link, so clearing them is not an option.
    expect(screen.getByRole('checkbox', { name: 'Remove the driver from every group' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Generate test link' }));

    expect(await screen.findByTestId('test-link')).toHaveTextContent(
      'http://apps.local.openedx.io:2011/uber-learn/launch#x',
    );
    expect(postBody(axiosMock)).toEqual({
      target: 'home',
      course_id: 'course-v1:Uber+DRV101+2026_Q4',
      path_id: 'new-driver-essentials,gone',
      groups: ['ev-drivers', 'porto'],
    });
    expect(screen.getByRole('link', { name: 'Open the test link in a new tab' })).toHaveAttribute(
      'href',
      'http://apps.local.openedx.io:2011/uber-learn/launch#x',
    );
    const summary = screen.getByText('What this link does').nextElementSibling as HTMLElement;
    expect(within(summary).getByText('Signs in as a new test driver, External ID dev-42')).toBeInTheDocument();
    expect(within(summary).getByText('Assigns the learning paths: New driver essentials, gone')).toBeInTheDocument();
    expect(within(summary).getByText('Enrolls in Getting started')).toBeInTheDocument();
    expect(within(summary).getByText('Opens the home page')).toBeInTheDocument();
    expect(within(summary).getByText('Puts the driver in: ev-drivers, porto')).toBeInTheDocument();
  });

  it('mints a path link that opens its first path, and a bare link that keeps the groups', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onPost(apiUrls.testLinks()).reply(
      201,
      rawTestLink({ target: 'path', path_id: 'new-driver-essentials,gone' }),
    );
    const user = userEvent.setup();
    render(
      <DeepLinkCard
        link={{ ...link, target: 'path', course: null, groups: [] }}
        config={config()}
        onEdit={jest.fn()}
      />,
    );
    await expandTestLink(user, /^lisbon onboarding/i);
    await user.click(screen.getByRole('button', { name: 'Generate test link' }));
    await screen.findByTestId('test-link');
    expect(postBody(axiosMock)).toEqual({
      target: 'path',
      course_id: '',
      path_id: 'new-driver-essentials,gone',
      groups: null,
    });
    expect(screen.getByText('Assigns and opens the learning path New driver essentials')).toBeInTheDocument();
    expect(screen.getByText('Keeps the driver\'s current groups')).toBeInTheDocument();
  });

  it('sends an empty groups list to remove the driver from every group', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onPost(apiUrls.testLinks()).reply(201, rawTestLink({ target: 'optional', groups: [] }));
    const user = userEvent.setup();
    render(<DeepLinkCard link={bareLink} config={config()} onEdit={jest.fn()} />);
    await expandTestLink(user, /^optional courses reminder/i);
    await user.click(screen.getByRole('checkbox', { name: 'Remove the driver from every group' }));
    await user.click(screen.getByRole('button', { name: 'Generate test link' }));
    await screen.findByTestId('test-link');
    expect(postBody(axiosMock).groups).toEqual([]);
    expect(screen.getByText('Opens the home page at Optional courses')).toBeInTheDocument();
    expect(screen.getByText('Removes the driver from every group')).toBeInTheDocument();
  });

  it('shows the server\'s groups error on the groups field and other errors in the alert', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onPost(apiUrls.testLinks()).reply(400, { groups: ['Server says no.'], ttl: ['Too long.'] });
    const user = userEvent.setup();
    render(<DeepLinkCard link={bareLink} config={config()} onEdit={jest.fn()} />);
    await expandTestLink(user, /^optional courses reminder/i);
    await user.click(screen.getByRole('button', { name: 'Generate test link' }));
    expect(await screen.findByText('Server says no.')).toBeInTheDocument();
    expect(screen.getByText('Couldn\'t generate the link')).toBeInTheDocument();
    expect(screen.getByText('Too long.')).toBeInTheDocument();
  });

  it('shows only the launch string when Studio has no Uber Learn URL', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onPost(apiUrls.testLinks()).reply(201, rawTestLink({ url: null }));
    const user = userEvent.setup();
    render(<DeepLinkCard link={bareLink} config={config({ learn_base_url: '' })} onEdit={jest.fn()} />);
    await expandTestLink(user, /^optional courses reminder/i);
    await user.click(screen.getByRole('button', { name: 'Generate test link' }));
    expect(await screen.findByTestId('test-link')).toHaveTextContent('external_id=dev-1&target=home');
    expect(screen.getByText(/Studio doesn't know the Uber Learn URL/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the test link in a new tab' })).not.toBeInTheDocument();
  });

  it.each([
    ['off', /no launch secret configured/],
    ['other_scheme', /signing scheme Studio can't mint/],
  ])('replaces the test link form with a warning when test links are %s', async (reason, text) => {
    initializeMocks();
    const user = userEvent.setup();
    render(
      <DeepLinkCard
        link={bareLink}
        config={config({ test_links: { enabled: false, unavailable_reason: reason } })}
        onEdit={jest.fn()}
      />,
    );
    await expandTestLink(user, /^optional courses reminder/i);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByTestId('test-link-form')).not.toBeInTheDocument();
  });
});
