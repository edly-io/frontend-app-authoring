import userEvent from '@testing-library/user-event';
import { logError } from '@edx/frontend-platform/logging';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import { apiUrls } from './data/api';
import CourseTagsButton from './CourseTagsButton';
import { COURSE_ID, mockCourseTags } from './testHelpers';

jest.mock('@src/CourseAuthoringContext', () => ({
  useCourseAuthoringContext: () => ({ courseId: 'course-v1:Uber+101+2026' }),
}));

jest.mock('@edx/frontend-platform/logging', () => ({
  ...jest.requireActual('@edx/frontend-platform/logging'),
  logError: jest.fn(),
}));

let axiosMock;

const mockStatus = (status: object) => axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, status);

/**
 * The first render of the button, and of the dialog, pays a one-off warm-up (about ten times a later render), which
 * under a loaded parallel run can exceed `findBy`'s default 1 s. Wait longer, but stay under Jest's 5 s test timeout
 * so a real failure still reports what is missing.
 */
const FIRST_RENDER = { timeout: 4000 };
const findTagsButton = () => screen.findByRole('button', { name: 'Tags' }, FIRST_RENDER);

describe('<CourseTagsButton />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    mockCourseTags(axiosMock);
  });

  it('shows the button when the flag is on and the user can assign', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    expect(await findTagsButton()).toBeInTheDocument();
  });

  it('requests the status of this course', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await findTagsButton();
    expect(axiosMock.history.get.map(({ url }) => url)).toContain(
      'http://localhost:18010/api/uber/course_tags/v1/status/?course_id=course-v1%3AUber%2B101%2B2026',
    );
  });

  it('is hidden when the flag is off', async () => {
    mockStatus({ enabled: false, can_assign: true });
    render(<CourseTagsButton />);
    await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('is hidden when the user cannot assign', async () => {
    mockStatus({ enabled: true, can_assign: false });
    render(<CourseTagsButton />);
    await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it.each([404, 403])('is hidden when the status request fails with %s, without logging', async (code) => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(code);
    render(<CourseTagsButton />);
    await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument();
    expect(logError).not.toHaveBeenCalled();
  });

  describe('when the status request keeps failing with a 5xx', () => {
    // React Query retries a 5xx three times with a backoff of 1 + 2 + 4 s; run that on fake time.
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('shows the button once the retries are spent, and logs the failure', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(500);
      render(<CourseTagsButton />);
      await waitFor(() => expect(axiosMock.history.get).toHaveLength(4), { timeout: 10000 });
      expect(await findTagsButton()).toBeInTheDocument();
      expect(logError).toHaveBeenCalledTimes(1);
    });
  });

  it('does not load the course tags until the dialog opens', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await findTagsButton();
    expect(axiosMock.history.get).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog on click without opening a window, and closes it again', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await userEvent.click(await findTagsButton());
    expect(await screen.findByRole('dialog', { name: 'Course tags' }, FIRST_RENDER)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    // The dialog has a header cross and a footer button, both named Close; click the footer one, which shows the text.
    await userEvent.click(screen.getByText('Close', { selector: 'button' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    open.mockRestore();
  });

  it('fetches the course tags when the dialog opens', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await userEvent.click(await findTagsButton());
    expect(await screen.findByText('This course has no tags yet.', undefined, FIRST_RENDER)).toBeInTheDocument();
    expect(axiosMock.history.get.map(({ url }) => url)).toContain(apiUrls.courseTags(COURSE_ID));
  });
});
