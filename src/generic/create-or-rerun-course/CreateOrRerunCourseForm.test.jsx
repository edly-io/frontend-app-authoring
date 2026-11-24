import {
  fireEvent,
  screen,
  render,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactDOM from 'react-dom';

import { initializeMockApp } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { AppProvider } from '@edx/frontend-platform/react';
import MockAdapter from 'axios-mock-adapter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import studioHomeMock from '@src/studio-home/__mocks__/studioHomeMock';
import { getStudioHomeApiUrl } from '../../studio-home/data/api';
import { fetchStudioHomeData } from '../../studio-home/data/thunks';
import { RequestStatus } from '../../data/constants';
import initializeStore from '../../store';
import { executeThunk } from '../../utils';
import { updateCreateOrRerunCourseQuery } from '../data/thunks';
import { getCreateOrRerunCourseUrl } from '../data/api';
import messages from './messages';
import { CreateOrRerunCourseForm } from '.';
import { initialState } from './factories/mockApiResponses';

const mockedUsedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    courseId: 'course-id-mock',
  }),
  useNavigate: () => mockedUsedNavigate,
}));

let axiosMock;
let store;
ReactDOM.createPortal = jest.fn(node => node);

const onClickCancelMock = jest.fn();
const slugUrlPattern = /\/api\/v1\/courses\/.+\/slug\//;

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const RootWrapper = (props) => (
  <QueryClientProvider client={queryClient}>
    <IntlProvider locale="en">
      <AppProvider store={store}>
        <CreateOrRerunCourseForm {...props} />
      </AppProvider>
    </IntlProvider>
  </QueryClientProvider>
);

const props = {
  title: 'Mocked title',
  isCreateNewCourse: true,
  initialValues: {
    displayName: '',
    org: '',
    number: '',
    run: '',
  },
  onClickCancel: onClickCancelMock,
};

const filledValues = {
  displayName: 'Slug Course',
  org: 'TestOrg',
  number: 'CS101',
  run: '2026',
};

// frontend-platform's http client interceptor adds `customAttributes.httpErrorResponseData` to
// failed requests. The mock adapter bypasses it, so build the same error shape here.
const slugConflictReply = () => {
  const error = new Error('Request failed with status code 400');
  error.customAttributes = {
    httpStatus: 400,
    httpErrorResponseData: JSON.stringify({ slug: ['course slug with this slug already exists.'] }),
  };
  return Promise.reject(error);
};

const mockStore = async () => {
  axiosMock.onGet(getStudioHomeApiUrl()).reply(200, studioHomeMock);
  // useProgramsConfig() in hooks.jsx calls /rwaq/api/programs/config/ — mock it so
  // tests don't fail with "No QueryClient" or make real network requests.
  axiosMock.onGet(/\/rwaq\/api\/programs\/config\//).reply(200, {
    organizations: [],
    program_types: [],
  });

  await executeThunk(fetchStudioHomeData, store.dispatch);
};

describe('<CreateOrRerunCourseForm />', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });
  beforeEach(async () => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });

    store = initializeStore(initialState);
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    // The create thunk always reserves the slug first (typed or computed default).
    axiosMock.onPut(slugUrlPattern).reply(200, { slug: 'reserved' });
  });

  it('renders form successfully', async () => {
    render(<RootWrapper {...props} />);
    await mockStore();

    expect(screen.getByText(props.title)).toBeInTheDocument();
    expect(screen.getByText(messages.courseDisplayNameLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.courseDisplayNamePlaceholder.defaultMessage)).toBeInTheDocument();

    expect(screen.getByText(messages.courseOrgLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText(messages.courseOrgNoOptions.defaultMessage)).toBeInTheDocument();

    expect(screen.getByText(messages.courseNumberLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.courseNumberPlaceholder.defaultMessage)).toBeInTheDocument();

    expect(screen.getByText(messages.courseRunLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.courseRunPlaceholder.defaultMessage)).toBeInTheDocument();
  });

  it('renders create course form with help text successfully', async () => {
    render(<RootWrapper {...props} />);
    await mockStore();
    expect(screen.getByText(messages.courseDisplayNameCreateHelpText.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('The name of the organization sponsoring the course.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('The unique number that identifies your course within your organization.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('The term in which your course will run.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.createButton.defaultMessage })).toBeInTheDocument();
  });

  it('renders rerun course form with help text successfully', async () => {
    const initialProps = { ...props, isCreateNewCourse: false };
    render(<RootWrapper {...initialProps} />);
    await mockStore();

    expect(screen.getByText(messages.courseDisplayNameRerunHelpText.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('The name of the organization sponsoring the new course. (This name is often the same as the original organization name.)', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(messages.courseNumberRerunHelpText.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('The term in which the new course will run. (This value is often different than the original course run value.)', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.rerunCreateButton.defaultMessage })).toBeInTheDocument();
  });

  it('should call handleOnClickCancel if button cancel clicked', async () => {
    render(<RootWrapper {...props} />);
    await mockStore();
    const cancelBtn = screen.getByRole('button', { name: messages.cancelButton.defaultMessage });
    fireEvent.click(cancelBtn);

    expect(onClickCancelMock).toHaveBeenCalled();
  });

  describe('handleOnClickCreate', () => {
    it('should call window.location.assign with url', async () => {
      const user = userEvent.setup();
      render(<RootWrapper {...props} />);
      await mockStore();
      const url = '/course/courseId';
      const displayNameInput = screen.getByPlaceholderText(messages.courseDisplayNamePlaceholder.defaultMessage);
      const orgInput = screen.getByText(messages.courseOrgNoOptions.defaultMessage);
      const numberInput = screen.getByPlaceholderText(messages.courseNumberPlaceholder.defaultMessage);
      const runInput = screen.getByPlaceholderText(messages.courseRunPlaceholder.defaultMessage);
      const createBtn = screen.getByRole('button', { name: messages.createButton.defaultMessage });

      await user.type(displayNameInput, 'foo course name');
      fireEvent.click(orgInput);
      await user.type(numberInput, '777');
      await user.type(runInput, '1');
      await user.click(createBtn);
      await axiosMock.onPost(getCreateOrRerunCourseUrl()).reply(200, { url });
      await executeThunk(updateCreateOrRerunCourseQuery({ org: 'testX', run: 'some' }), store.dispatch);

      expect(mockedUsedNavigate).toHaveBeenCalledWith(url);
    });
    it('should call window.location.assign with url and destinationCourseKey', async () => {
      const user = userEvent.setup();
      render(<RootWrapper {...props} />);
      await mockStore();
      const url = '/course/';
      const destinationCourseKey = 'courseKey';
      const displayNameInput = screen.getByPlaceholderText(messages.courseDisplayNamePlaceholder.defaultMessage);
      const orgInput = screen.getByText(messages.courseOrgNoOptions.defaultMessage);
      const numberInput = screen.getByPlaceholderText(messages.courseNumberPlaceholder.defaultMessage);
      const runInput = screen.getByPlaceholderText(messages.courseRunPlaceholder.defaultMessage);
      const createBtn = screen.getByRole('button', { name: messages.createButton.defaultMessage });
      await axiosMock.onPost(getCreateOrRerunCourseUrl()).reply(200, { url, destinationCourseKey });

      await user.type(displayNameInput, 'foo course name');
      fireEvent.click(orgInput);
      await user.type(numberInput, '777');
      await user.type(runInput, '1');
      await user.click(createBtn);
      await executeThunk(updateCreateOrRerunCourseQuery({ org: 'testX', run: 'some' }), store.dispatch);

      expect(mockedUsedNavigate).toHaveBeenCalledWith(`${url}${destinationCourseKey}`);
    });
  });

  it('should be disabled create button if form not filled', async () => {
    render(<RootWrapper {...props} />);
    await mockStore();
    const createBtn = screen.getByRole('button', { name: messages.createButton.defaultMessage });
    expect(createBtn).toBeDisabled();
  });

  it('should be disabled rerun button if form not filled', async () => {
    const initialProps = { ...props, isCreateNewCourse: false };
    render(<RootWrapper {...initialProps} />);
    await mockStore();
    const rerunBtn = screen.getByRole('button', { name: messages.rerunCreateButton.defaultMessage });
    expect(rerunBtn).toBeDisabled();
  });

  it('shows error message when total length exceeds 65 characters', async () => {
    const updatedProps = {
      ...props,
      initialValues: {
        displayName: 'Long Title Course',
        org: 'long-org',
        number: 'number',
        run: '2024',
      },
    };

    render(<RootWrapper {...updatedProps} />);
    await mockStore();
    const numberInput = screen.getByPlaceholderText(messages.courseNumberPlaceholder.defaultMessage);

    fireEvent.change(numberInput, { target: { value: 'long-name-which-is-longer-than-65-characters-to-check-for-errors' } });

    await waitFor(() => {
      expect(screen.getByText(messages.totalLengthError.defaultMessage)).toBeInTheDocument();
    });
  });

  it('should be disabled create button if form has error', async () => {
    const user = userEvent.setup();
    render(<RootWrapper {...props} />);
    await mockStore();
    const createBtn = await screen.findByRole('button', { name: messages.createButton.defaultMessage });
    const displayNameInput = await screen.findByPlaceholderText(messages.courseDisplayNamePlaceholder.defaultMessage);
    const orgInput = await screen.findByText(messages.courseOrgNoOptions.defaultMessage);
    const numberInput = await screen.findByPlaceholderText(messages.courseNumberPlaceholder.defaultMessage);
    const runInput = await screen.findByPlaceholderText(messages.courseRunPlaceholder.defaultMessage);

    fireEvent.change(displayNameInput, { target: { value: 'foo course name' } });
    await user.click(orgInput);
    fireEvent.change(numberInput, { target: { value: 'number with invalid (+) symbol' } });
    fireEvent.change(runInput, { target: { value: 'number with invalid (=) symbol' } });

    expect(createBtn).toBeDisabled();
  });

  it('shows typeahead dropdown with allowed to create org permissions', async () => {
    const updatedStudioData = { ...studioHomeMock, allowToCreateNewOrg: true };
    store = initializeStore({
      ...initialState,
      studioHome: {
        ...initialState.studioHome,
        studioHomeData: updatedStudioData,
      },
    });
    render(<RootWrapper {...props} />);
    await mockStore();

    await screen.findByPlaceholderText(messages.courseOrgPlaceholder.defaultMessage);
  });

  it('shows button pending state', async () => {
    store = initializeStore({
      ...initialState,
      generic: {
        ...initialState.generic,
        savingStatus: RequestStatus.PENDING,
      },
    });
    render(<RootWrapper {...props} />);
    await mockStore();
    await screen.findByRole('button', { name: messages.creatingButton.defaultMessage });
  });

  it('shows alert error if postErrors presents', async () => {
    render(<RootWrapper {...props} />);
    await screen.findByText(props.title);
    await mockStore();
    await axiosMock.onPost(getCreateOrRerunCourseUrl()).reply(200, { errMsg: 'aaa' });
    await executeThunk(updateCreateOrRerunCourseQuery({ org: 'testX', run: 'some' }), store.dispatch);

    await screen.findByText('aaa');
  });

  it('shows error on field', async () => {
    render(<RootWrapper {...props} />);
    await mockStore();
    const numberInput = await screen.findByPlaceholderText(messages.courseNumberPlaceholder.defaultMessage);

    fireEvent.change(numberInput, { target: { value: 'number with invalid (+) symbol' } });
    fireEvent.blur(numberInput);

    await waitFor(() => {
      expect(screen.getByText(messages.disallowedCharsError.defaultMessage)).toBeInTheDocument();
    });
  });

  describe('course slug', () => {
    const slugInputPlaceholder = messages.courseSlugPlaceholder.defaultMessage;
    const renderForm = async (initialValues) => {
      render(<RootWrapper {...props} initialValues={initialValues} />);
      await mockStore();
    };

    it('shows the generic help text while org, number and run are not all filled', async () => {
      await renderForm({ ...filledValues, run: '' });
      expect(screen.getByText(messages.courseSlugHelpText.defaultMessage)).toBeInTheDocument();
    });

    it('shows the computed slug in the help text when the slug is blank', async () => {
      await renderForm(filledValues);
      expect(screen.getByText('Leave blank to use course-v1-testorg-cs101-2026.')).toBeInTheDocument();
    });

    it('shows the typed slug in the help text', async () => {
      await renderForm(filledValues);
      fireEvent.change(screen.getByPlaceholderText(slugInputPlaceholder), { target: { value: 'my-slug' } });
      await waitFor(() => {
        expect(
          screen.getByText('This slug will be used in WordPress URLs for this course: my-slug'),
        ).toBeInTheDocument();
      });
      expect(screen.queryByText(/Leave blank to use/)).not.toBeInTheDocument();
    });

    it('reserves the computed default slug before creating the course when the slug is blank', async () => {
      const user = userEvent.setup();
      axiosMock.onPost(getCreateOrRerunCourseUrl()).reply(200, { url: '/course/' });
      await renderForm(filledValues);
      await user.click(await screen.findByRole('button', { name: messages.createButton.defaultMessage }));

      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(axiosMock.history.put).toHaveLength(1);
      expect(axiosMock.history.put[0].url).toContain('course-v1:TestOrg+CS101+2026/slug/');
      expect(JSON.parse(axiosMock.history.put[0].data)).toEqual({ slug: 'course-v1-testorg-cs101-2026' });
    });

    it('shows the duplicate error naming the default slug and does not create the course when blank', async () => {
      const user = userEvent.setup();
      axiosMock.onPut(slugUrlPattern).reply(slugConflictReply);
      await renderForm(filledValues);
      await user.click(await screen.findByRole('button', { name: messages.createButton.defaultMessage }));

      expect(await screen.findByText(
        'The default slug course-v1-testorg-cs101-2026 is already used by another course. Enter a custom slug.',
      )).toBeInTheDocument();
      expect(axiosMock.history.post).toHaveLength(0);
    });

    it('shows the duplicate error naming the typed slug and does not create the course', async () => {
      const user = userEvent.setup();
      axiosMock.onPut(slugUrlPattern).reply(slugConflictReply);
      await renderForm(filledValues);
      fireEvent.change(screen.getByPlaceholderText(slugInputPlaceholder), { target: { value: 'taken-slug' } });
      await user.click(await screen.findByRole('button', { name: messages.createButton.defaultMessage }));

      expect(await screen.findByText(
        'The slug taken-slug is already in use by another course. Please choose a different one.',
      )).toBeInTheDocument();
      expect(axiosMock.history.post).toHaveLength(0);
    });

    it('shows the save error and does not create the course when a typed slug fails otherwise', async () => {
      const user = userEvent.setup();
      axiosMock.onPut(slugUrlPattern).reply(500);
      await renderForm(filledValues);
      fireEvent.change(screen.getByPlaceholderText(slugInputPlaceholder), { target: { value: 'my-slug' } });
      await user.click(await screen.findByRole('button', { name: messages.createButton.defaultMessage }));

      expect(await screen.findByText(messages.slugSaveError.defaultMessage)).toBeInTheDocument();
      expect(axiosMock.history.post).toHaveLength(0);
    });

    it('still creates the course when the default slug cannot be reserved for a non-conflict reason', async () => {
      const user = userEvent.setup();
      axiosMock.onPut(slugUrlPattern).reply(403);
      axiosMock.onPost(getCreateOrRerunCourseUrl()).reply(200, { url: '/course/' });
      await renderForm(filledValues);
      await user.click(await screen.findByRole('button', { name: messages.createButton.defaultMessage }));

      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(screen.queryByText(messages.slugSaveError.defaultMessage)).not.toBeInTheDocument();
    });
  });
});
