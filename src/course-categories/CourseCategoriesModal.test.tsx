import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
} from '@src/testUtils';

import CourseCategoriesModal from './CourseCategoriesModal';
import { COURSE_ID, mockLoaded } from './testHelpers';

const renderModal = (canManage: boolean, onClose = jest.fn()) => {
  render(<CourseCategoriesModal courseId={COURSE_ID} canManage={canManage} onClose={onClose} />);
  return onClose;
};

describe('<CourseCategoriesModal />', () => {
  beforeEach(() => {
    const { axiosMock } = initializeMocks();
    mockLoaded(axiosMock);
  });

  it('shows both tabs to a user who can manage', async () => {
    renderModal(true);
    expect(await screen.findByRole('tab', { name: 'Course Categories' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Manage Categories' })).toBeInTheDocument();
  });

  it('shows no tab strip and no manage controls to a user who can only assign', async () => {
    renderModal(false);
    expect(await screen.findByRole('searchbox', { name: 'Add a category' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Rename / })).not.toBeInTheDocument();
  });

  it('starts on the assign tab and switches to the manage tab', async () => {
    renderModal(true);
    expect(await screen.findByRole('searchbox', { name: 'Add a category' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Manage Categories' }));
    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('calls onClose from the Close button', async () => {
    const onClose = renderModal(false);
    await screen.findByRole('searchbox');
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
    expect(onClose).toHaveBeenCalled();
  });
});
