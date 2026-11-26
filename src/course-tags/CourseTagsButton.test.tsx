import userEvent from '@testing-library/user-event';
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

let axiosMock;

const mockStatus = (status: object) => axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, status);

describe('<CourseTagsButton />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    mockCourseTags(axiosMock);
  });

  it('shows the button when the flag is on and the user can assign', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    expect(await screen.findByRole('button', { name: 'Tags' })).toBeInTheDocument();
  });

  it('requests the status of this course', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await screen.findByRole('button', { name: 'Tags' });
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

  it.each([404, 403, 500])('is hidden when the status request fails with %s', async (code) => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(code);
    render(<CourseTagsButton />);
    await waitFor(() => expect(axiosMock.history.get.length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('does not load the course tags until the dialog opens', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await screen.findByRole('button', { name: 'Tags' });
    expect(axiosMock.history.get).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog on click without opening a window, and closes it again', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tags' }));
    expect(await screen.findByRole('dialog', { name: 'Course tags' })).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    // The dialog has a header cross and a footer Close button, both named Close.
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    open.mockRestore();
  });

  it('fetches the course tags when the dialog opens', async () => {
    mockStatus({ enabled: true, can_assign: true });
    render(<CourseTagsButton />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tags' }));
    expect(await screen.findByText('This course has no tags yet.')).toBeInTheDocument();
    expect(axiosMock.history.get.map(({ url }) => url)).toContain(apiUrls.courseTags(COURSE_ID));
  });
});
