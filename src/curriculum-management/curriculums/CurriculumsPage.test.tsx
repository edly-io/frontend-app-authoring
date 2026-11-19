import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import { page, rawCourseCurriculum, rawCurriculums } from '../__mocks__/fixtures';
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

const renderPage = (url = '/') =>
  render(
    <Routes>
      <Route element={<OutletHarness />}>
        <Route path="*" element={<CurriculumsPage />} />
      </Route>
    </Routes>,
    { routerProps: { initialEntries: [url] } },
  );

describe('<CurriculumsPage />', () => {
  it('shows the empty state and opens the create form from it', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page([]));
    renderPage();
    expect(await screen.findByText('You haven\'t created any learning paths yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New learning path' }));
    expect(screen.getByTestId('curriculum-form')).toHaveTextContent('new');
  });

  it('keeps even the only curriculum collapsed, and opens the edit form over the list', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    renderPage();
    expect(await screen.findByRole('button', { name: /^new driver essentials/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('Courses')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit New driver essentials' }));
    expect(screen.getByTestId('curriculum-form')).toHaveTextContent('edit:cur-1');
    // The form is a modal: the card stays in the list underneath.
    expect(screen.getByTestId('curriculum-card')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'close form' }));
    expect(screen.queryByTestId('curriculum-form')).not.toBeInTheDocument();
  });

  it('expands and scrolls to the curriculum named in the open param', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(
      200,
      page([
        ...rawCurriculums,
        { ...rawCurriculums[0], uuid: 'cur-3', title: 'Holiday rush' },
      ]),
    );
    // jsdom has no scrollIntoView.
    const scrollIntoView = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderPage('/?open=cur-1');
    const opened = await screen.findByRole('button', { name: /^new driver essentials/i });
    expect(opened).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^holiday rush/i })).toHaveAttribute('aria-expanded', 'false');
    expect(scrollIntoView.mock.contexts).toEqual([opened.closest('[data-testid="curriculum-card"]')]);
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  });

  it('closes the form when it asks to cancel', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page(rawCurriculums));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit New driver essentials' }));
    await userEvent.click(screen.getByRole('button', { name: 'cancel form' }));
    expect(screen.queryByTestId('curriculum-form')).not.toBeInTheDocument();
  });

  it('filters the list by title, learning path ID or uuid, and shows the count', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page([...rawCurriculums, rawCourseCurriculum]));
    renderPage();
    expect(await screen.findByText('2 learning paths')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox'), 'airport');
    expect(screen.getByText('1 learning path')).toBeInTheDocument();
    expect(screen.getAllByTestId('curriculum-card')).toHaveLength(1);
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'new-driver');
    expect(screen.getByText('1 learning path')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('0 learning paths')).toBeInTheDocument();
  });
});
