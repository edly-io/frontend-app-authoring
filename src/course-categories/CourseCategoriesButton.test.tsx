import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import { apiUrls } from './data/api';
import CourseCategoriesButton from './CourseCategoriesButton';
import { COURSE_ID, mockLoaded } from './testHelpers';

jest.mock('@src/CourseAuthoringContext', () => ({
  useCourseAuthoringContext: () => ({ courseId: 'course-v1:Uber+101+2026' }),
}));

let axiosMock;

const mockStatus = (status: object) => axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, status);

describe('<CourseCategoriesButton />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    mockLoaded(axiosMock);
  });

  it('shows the button when the flag is on and the user can assign', async () => {
    mockStatus({ enabled: true, can_assign: true, can_manage: false });
    render(<CourseCategoriesButton />);
    expect(await screen.findByRole('button', { name: 'Categories' })).toBeInTheDocument();
  });

  it('requests the status of this course', async () => {
    mockStatus({ enabled: true, can_assign: true, can_manage: false });
    render(<CourseCategoriesButton />);
    await screen.findByRole('button', { name: 'Categories' });
    expect(axiosMock.history.get.map(({ url }) => url)).toContain(
      'http://localhost:18010/api/uber/course_categories/v1/status/?course_id=course-v1%3AUber%2B101%2B2026',
    );
  });

  it('is hidden when the flag is off', async () => {
    mockStatus({ enabled: false, can_assign: true, can_manage: true });
    render(<CourseCategoriesButton />);
    await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('is hidden when the user cannot assign', async () => {
    mockStatus({ enabled: true, can_assign: false, can_manage: false });
    render(<CourseCategoriesButton />);
    await waitFor(() => expect(axiosMock.history.get).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it.each([404, 403])('is hidden when the status request fails with %s', async (code) => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(code);
    render(<CourseCategoriesButton />);
    await waitFor(() => expect(axiosMock.history.get.length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('does not load the categories until the dialog opens', async () => {
    mockStatus({ enabled: true, can_assign: true, can_manage: false });
    render(<CourseCategoriesButton />);
    await screen.findByRole('button', { name: 'Categories' });
    expect(axiosMock.history.get).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog on click and closes it again', async () => {
    mockStatus({ enabled: true, can_assign: true, can_manage: false });
    render(<CourseCategoriesButton />);
    await userEvent.click(await screen.findByRole('button', { name: 'Categories' }));
    expect(await screen.findByRole('dialog', { name: 'Course categories' })).toBeInTheDocument();
    // The dialog has a header cross and a footer Close button, both named Close.
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('passes can_manage on: the Manage tab shows for global staff', async () => {
    mockStatus({ enabled: true, can_assign: true, can_manage: true });
    render(<CourseCategoriesButton />);
    await userEvent.click(await screen.findByRole('button', { name: 'Categories' }));
    expect(await screen.findByRole('tab', { name: 'Manage Categories' })).toBeInTheDocument();
  });
});
