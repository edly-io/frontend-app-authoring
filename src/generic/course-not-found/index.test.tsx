import { initializeMocks, render, waitFor } from '@src/testUtils';
import { getApiBaseUrl } from '@src/studio-home/data/api';
import CourseNotFoundHandler from '.';

// `inProcessCourseActions` is served by the /home/courses endpoint (not /home).
const coursesApiUrl = () => `${getApiBaseUrl()}/api/contentstore/v1/home/courses`;

const courseId = 'course-v1:edX+TestX+Test_Course';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

let axiosMock;

beforeEach(() => {
  const mocks = initializeMocks();
  axiosMock = mocks.axiosMock;
  mockNavigate.mockClear();
  mockDispatch.mockClear();
});

const mockHomeResponse = (inProcessCourseActions) => {
  axiosMock.onGet(coursesApiUrl()).reply(200, { inProcessCourseActions });
};

describe('<CourseNotFoundHandler />', () => {
  it('shows a loading/being-created state while the rerun is in progress', async () => {
    mockHomeResponse([{
      courseKey: courseId,
      displayName: 'Test Course',
      org: 'edX',
      number: 'TestX',
      run: 'Test_Course',
      isFailed: false,
      isInProgress: true,
      dismissLink: '',
    }]);

    const wrapper = render(<CourseNotFoundHandler courseId={courseId} />);

    expect(await wrapper.findByTestId('courseRerunLoading')).toBeInTheDocument();
    expect(wrapper.getByText(/This course is being created/)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows a clear failure message and a way back to Studio Home when the rerun failed', async () => {
    mockHomeResponse([{
      courseKey: courseId,
      displayName: 'Test Course',
      org: 'edX',
      number: 'TestX',
      run: 'Test_Course',
      isFailed: true,
      isInProgress: false,
      dismissLink: '/some/dismiss/link',
    }]);

    const wrapper = render(<CourseNotFoundHandler courseId={courseId} />);

    expect(await wrapper.findByTestId('courseRerunFailedAlert')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    wrapper.getByRole('button', { name: 'Back to Studio Home' }).click();
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  it('redirects to Studio Home with a dismissible-alert flag when there is no rerun record at all', async () => {
    mockHomeResponse([]);

    render(<CourseNotFoundHandler courseId={courseId} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', { state: { courseNotFoundRedirect: true } });
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not redirect while the rerun-status check itself is still pending', async () => {
    // A promise that never resolves within this test -- simulates the request still
    // being in flight, so we can assert there's no premature redirect before we know
    // whether a rerun record exists.
    axiosMock.onGet(coursesApiUrl()).reply(() => new Promise(() => {}));

    const wrapper = render(<CourseNotFoundHandler courseId={courseId} />);

    expect(await wrapper.findByTestId('courseRerunLoading')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
