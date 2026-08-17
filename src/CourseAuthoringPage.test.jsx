import { getConfig } from '@edx/frontend-platform';

import CourseAuthoringPage from './CourseAuthoringPage';
import PagesAndResources from './pages-and-resources/PagesAndResources';
import { executeThunk } from './utils';
import { fetchCourseApps } from './pages-and-resources/data/thunks';
import { fetchCourseDetail } from './data/thunks';
import { getApiWaffleFlagsUrl } from './data/api';
import { getApiBaseUrl } from './studio-home/data/api';
import { generateGetStudioHomeDataApiResponse } from './studio-home/factories/mockApiResponses';
import { initializeMocks, render, waitFor } from './testUtils';

const courseId = 'course-v1:edX+TestX+Test_Course';
let mockPathname = '/evilguy/';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: mockPathname,
  }),
  useNavigate: () => mockNavigate,
}));
let axiosMock;
let store;

beforeEach(async () => {
  const mocks = initializeMocks();
  store = mocks.reduxStore;
  axiosMock = mocks.axiosMock;
  axiosMock
    .onGet(getApiWaffleFlagsUrl(courseId))
    .reply(200, {});
  mockNavigate.mockClear();
});

describe('Editor Pages Load no header', () => {
  const mockStoreSuccess = async () => {
    const apiBaseUrl = getConfig().STUDIO_BASE_URL;
    const courseAppsApiUrl = `${apiBaseUrl}/api/course_apps/v1/apps`;
    axiosMock.onGet(`${courseAppsApiUrl}/${courseId}`).reply(200, {
      response: { status: 200 },
    });
    await executeThunk(fetchCourseApps(courseId), store.dispatch);
  };
  test('renders no loading wheel on editor pages', async () => {
    mockPathname = '/editor/';
    await mockStoreSuccess();
    const wrapper = render(
      <CourseAuthoringPage courseId={courseId}>
        <PagesAndResources courseId={courseId} />
      </CourseAuthoringPage>
      ,
    );
    expect(wrapper.queryByRole('status')).not.toBeInTheDocument();
  });
  test('renders loading wheel on non editor pages', async () => {
    mockPathname = '/evilguy/';
    await mockStoreSuccess();
    const wrapper = render(
      <CourseAuthoringPage courseId={courseId}>
        <PagesAndResources courseId={courseId} />
      </CourseAuthoringPage>
      ,
    );
    expect(wrapper.queryByRole('status')).toBeInTheDocument();
  });
});

describe('Course authoring page', () => {
  const lmsApiBaseUrl = getConfig().LMS_BASE_URL;
  const courseDetailApiUrl = `${lmsApiBaseUrl}/api/courses/v1/courses`;
  const mockStoreNotFound = async () => {
    axiosMock.onGet(
      `${courseDetailApiUrl}/${courseId}?username=abc123`,
    ).reply(404, {
      response: { status: 404 },
    });
    await executeThunk(fetchCourseDetail(courseId), store.dispatch);
  };
  const mockStoreError = async () => {
    axiosMock.onGet(
      `${courseDetailApiUrl}/${courseId}?username=abc123`,
    ).reply(500, {
      response: { status: 500 },
    });
    await executeThunk(fetchCourseDetail(courseId), store.dispatch);
  };
  test('redirects to Studio Home when the course truly does not exist (no rerun in progress)', async () => {
    await mockStoreNotFound();
    axiosMock.onGet(`${getApiBaseUrl()}/api/contentstore/v1/home/courses`).reply(200, {
      ...generateGetStudioHomeDataApiResponse(),
      inProcessCourseActions: [],
    });
    render(<CourseAuthoringPage courseId={courseId} />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', { state: { courseNotFoundRedirect: true } });
    });
  });

  test('shows a loading state (not a bare "Not found") while a course rerun is still in progress', async () => {
    await mockStoreNotFound();
    axiosMock.onGet(`${getApiBaseUrl()}/api/contentstore/v1/home/courses`).reply(200, {
      ...generateGetStudioHomeDataApiResponse(),
      inProcessCourseActions: [{
        courseKey: courseId,
        displayName: 'Test Course',
        org: 'edX',
        number: 'TestX',
        run: 'Test_Course',
        isFailed: false,
        isInProgress: true,
        dismissLink: '',
      }],
    });
    const wrapper = render(<CourseAuthoringPage courseId={courseId} />);
    expect(await wrapper.findByTestId('courseRerunLoading')).toBeInTheDocument();
    expect(wrapper.queryByTestId('notFoundAlert')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
  test('does not render not found page on other kinds of error', async () => {
    await mockStoreError();
    // Currently, loading errors are not handled, so we wait for the child
    // content to be rendered -which happens when request status is no longer
    // IN_PROGRESS but also not NOT_FOUND or DENIED- then check that the not
    // found alert is not present.
    const contentTestId = 'courseAuthoringPageContent';
    const wrapper = render(
      <CourseAuthoringPage courseId={courseId}>
        <div data-testid={contentTestId} />
      </CourseAuthoringPage>
      ,
    );
    expect(await wrapper.findByTestId(contentTestId)).toBeInTheDocument();
    expect(wrapper.queryByTestId('notFoundAlert')).not.toBeInTheDocument();
  });
  const mockStoreDenied = async () => {
    const studioApiBaseUrl = getConfig().STUDIO_BASE_URL;
    const courseAppsApiUrl = `${studioApiBaseUrl}/api/course_apps/v1/apps`;

    axiosMock.onGet(
      `${courseAppsApiUrl}/${courseId}`,
    ).reply(403);
    await executeThunk(fetchCourseApps(courseId), store.dispatch);
  };
  test('renders PermissionDeniedAlert when courseAppsApiStatus is DENIED', async () => {
    mockPathname = '/editor/';
    await mockStoreDenied();

    const wrapper = render(<CourseAuthoringPage courseId={courseId} />);
    expect(await wrapper.findByTestId('permissionDeniedAlert')).toBeInTheDocument();
  });
});
