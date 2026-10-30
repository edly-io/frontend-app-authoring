import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import { page, rawCourseGroups } from '../__mocks__/fixtures';
import OutletHarness from '../__mocks__/OutletHarness';
import { apiUrls } from '../data/api';
import CourseGroupsPage from './CourseGroupsPage';

jest.mock('./CourseGroupForm', () => ({
  __esModule: true,
  default: ({ group, onClose, onCancel }: {
    group?: { slug: string; };
    onClose: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="course-group-form">
      {group ? `edit:${group.slug}` : 'new'}
      <button type="button" onClick={onClose}>close form</button>
      <button type="button" onClick={onCancel}>cancel form</button>
    </div>
  ),
}));

const renderPage = () =>
  render(
    <Routes>
      <Route element={<OutletHarness />}>
        <Route path="*" element={<CourseGroupsPage />} />
      </Route>
    </Routes>,
  );

describe('<CourseGroupsPage />', () => {
  it('shows the empty state and opens the create form from it', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.courseGroupsPage(1)).reply(200, page([]));
    renderPage();
    expect(await screen.findByText('You haven\'t created any course groups yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New course group' }));
    expect(screen.getByTestId('course-group-form')).toHaveTextContent('new');
  });

  it('lists the groups collapsed and opens the edit form over the list', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.courseGroupsPage(1)).reply(200, page(rawCourseGroups));
    renderPage();
    expect(await screen.findByRole('button', { name: /^ev drivers/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByTestId('course-group-card')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Edit EV drivers' }));
    expect(screen.getByTestId('course-group-form')).toHaveTextContent('edit:ev-drivers');
    await userEvent.click(screen.getByRole('button', { name: 'cancel form' }));
    expect(screen.queryByTestId('course-group-form')).not.toBeInTheDocument();
  });

  it('shows the connection error alert, and no list, when the groups fail to load', async () => {
    const { axiosMock } = initializeMocks();
    // A 4xx: a 5xx is retried with a backoff that outlasts the test.
    axiosMock.onGet(apiUrls.courseGroupsPage(1)).reply(404);
    renderPage();
    expect(await screen.findByTestId('connectionErrorAlert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New course group' })).not.toBeInTheDocument();
  });
});
