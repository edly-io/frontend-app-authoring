import CourseAuthoringRoutes from './CourseAuthoringRoutes';
import { getApiWaffleFlagsUrl } from './data/api';
import {
  screen,
  initializeMocks,
  render,
  waitFor,
} from './testUtils';

const courseId = 'course-v1:edX+TestX+Test_Course';
const pagesAndResourcesMockText = 'Pages And Resources';
const editorContainerMockText = 'Editor Container';
const videoSelectorContainerMockText = 'Video Selector Container';
const customPagesMockText = 'Custom Pages';
const mockComponentFn = jest.fn();
const publishHistoryMockText = 'Publish History Page';
const publishHistoryCompareMockText = 'Publish History Compare Page';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    courseId,
  }),
}));

// Mock the TinyMceWidget
jest.mock('./editors/sharedComponents/TinyMceWidget', () => ({
  __esModule: true, // Required to mock a default export
  default: () => <div>Widget</div>,
  Footer: () => <div>Footer</div>,
  prepareEditorRef: jest.fn(() => ({
    refReady: true,
    setEditorRef: jest.fn().mockName('prepareEditorRef.setEditorRef'),
  })),
}));

jest.mock('./pages-and-resources/PagesAndResources', () => (props) => {
  mockComponentFn(props);
  return pagesAndResourcesMockText;
});
jest.mock('./editors/EditorContainer', () => (props) => {
  mockComponentFn(props);
  return editorContainerMockText;
});
jest.mock('./selectors/VideoSelectorContainer', () => (props) => {
  mockComponentFn(props);
  return videoSelectorContainerMockText;
});
jest.mock('./publish-history', () => ({
  PublishHistoryPage: () => publishHistoryMockText,
  PublishHistoryComparePage: () => publishHistoryCompareMockText,
}));
jest.mock('./custom-pages/CustomPages', () => (props) => {
  mockComponentFn(props);
  return customPagesMockText;
});

describe('<CourseAuthoringRoutes>', () => {
  beforeEach(async () => {
    const user = {
      userId: 1,
      username: 'username',
    };
    const { axiosMock } = initializeMocks({ user });
    axiosMock
      .onGet(getApiWaffleFlagsUrl(courseId))
      .reply(200, {});
  });

  it('renders the PagesAndResources component when the pages and resources route is active', async () => {
    render(
      <CourseAuthoringRoutes />,
      { routerProps: { initialEntries: ['/pages-and-resources'] } },
    );
    await waitFor(() => {
      expect(screen.getByText(pagesAndResourcesMockText)).toBeVisible();
      expect(mockComponentFn).toHaveBeenCalled();
    });
  });

  it('renders the EditorContainer component when the course editor route is active', async () => {
    render(
      <CourseAuthoringRoutes />,
      { routerProps: { initialEntries: ['/editor/video/block-id'] } },
    );
    await waitFor(() => {
      expect(screen.queryByText(editorContainerMockText)).toBeInTheDocument();
      expect(screen.queryByText(pagesAndResourcesMockText)).not.toBeInTheDocument();
      expect(mockComponentFn).toHaveBeenCalledWith(
        expect.objectContaining({
          learningContextId: courseId,
        }),
      );
    });
  });

  it('renders the VideoSelectorContainer component when the course videos route is active', async () => {
    render(
      <CourseAuthoringRoutes />,
      { routerProps: { initialEntries: ['/editor/course-videos/block-id'] } },
    );
    await waitFor(() => {
      expect(screen.queryByText(videoSelectorContainerMockText)).toBeInTheDocument();
      expect(screen.queryByText(pagesAndResourcesMockText)).not.toBeInTheDocument();
      expect(mockComponentFn).toHaveBeenCalled();
    });
  });

  it('renders the publish history page on its route', async () => {
    render(
      <CourseAuthoringRoutes />,
      { routerProps: { initialEntries: ['/publish_history'] } },
    );
    expect(await screen.findByText(publishHistoryMockText)).toBeInTheDocument();
    expect(screen.queryByText(publishHistoryCompareMockText)).not.toBeInTheDocument();
  });

  it('renders the compare page on the compare route, keeping the query string', async () => {
    render(
      <CourseAuthoringRoutes />,
      { routerProps: { initialEntries: ['/publish_history/compare?version=abc'] } },
    );
    expect(await screen.findByText(publishHistoryCompareMockText)).toBeInTheDocument();
    expect(screen.queryByText(publishHistoryMockText)).not.toBeInTheDocument();
  });
});
