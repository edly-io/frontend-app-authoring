import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import { page, rawCurriculums } from '../__mocks__/fixtures';
import OutletHarness from '../__mocks__/OutletHarness';
import { apiUrls } from '../data/api';
import CurriculumsPage from './CurriculumsPage';

jest.mock('./CurriculumForm', () => ({
  __esModule: true,
  default: ({ curriculum, onClose, onCancel }: {
    curriculum?: { uuid: string; };
    onClose: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="curriculum-form">
      {curriculum ? `edit:${curriculum.uuid}` : 'new'}
      <button type="button" onClick={onClose}>close form</button>
      <button type="button" onClick={onCancel}>cancel form</button>
    </div>
  ),
}));

const renderPage = () =>
  render(
    <Routes>
      <Route element={<OutletHarness />}>
        <Route path="*" element={<CurriculumsPage />} />
      </Route>
    </Routes>,
  );

describe('<CurriculumsPage />', () => {
  it('shows the empty state and opens the create form from it', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page([]));
    renderPage();
    expect(await screen.findByText('You haven\'t created any curriculums yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New curriculum' }));
    expect(screen.getByTestId('curriculum-form')).toHaveTextContent('new');
  });

  it('expands the only curriculum and opens the edit form over the list', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    renderPage();
    expect(await screen.findByText('Courses, in learner order')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('curriculum-form')).toHaveTextContent('edit:cur-1');
    // The form is a modal: the card stays in the list underneath.
    expect(screen.getByTestId('curriculum-card')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'close form' }));
    expect(screen.queryByTestId('curriculum-form')).not.toBeInTheDocument();
  });

  it('closes the form when it asks to cancel', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'cancel form' }));
    expect(screen.queryByTestId('curriculum-form')).not.toBeInTheDocument();
  });
});
