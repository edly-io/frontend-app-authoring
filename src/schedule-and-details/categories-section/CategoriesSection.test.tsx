import { getConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import CategoriesSection from '.';

const courseId = 'course-v1:ArbOrg+CAT01+2026';
let axiosMock;

const url = () => `${getConfig().STUDIO_BASE_URL}/rwaq/api/categories/by-course/${encodeURIComponent(courseId)}/`;

const all = [
  {
    id: 1, name: 'Business', arabic_name: 'الأعمال', is_active: true,
  },
  {
    id: 2, name: 'Science', arabic_name: null, is_active: true,
  },
  {
    id: 3, name: 'Retired', arabic_name: 'قديم', is_active: false,
  },
];

const mockLoad = (assigned = [all[0]]) => {
  axiosMock.onGet(url(), { params: { scope: 'all' } }).reply(200, all);
  axiosMock.onGet(url()).reply(200, assigned);
};

const openMenu = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Select categories' }));
};

describe('<CategoriesSection />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('lists every category, including inactive ones, and marks assigned ones', async () => {
    mockLoad();
    render(<CategoriesSection courseId={courseId} />);
    await openMenu();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Business' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Science' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Retired' })).toBeInTheDocument();
  });

  it('shows Arabic names on Arabic locale and falls back to English', async () => {
    mockLoad();
    render(<IntlProvider locale="ar" messages={{}}><CategoriesSection courseId={courseId} /></IntlProvider>);
    fireEvent.click(await screen.findByRole('button'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'الأعمال' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Science' })).toBeInTheDocument();
  });

  it('adds a category with POST and updates the selection after success', async () => {
    mockLoad();
    axiosMock.onPost(url()).reply(201, {});
    render(<CategoriesSection courseId={courseId} />);
    await openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Science' }));
    await waitFor(() => expect(screen.getByRole('menuitemcheckbox', { name: 'Science' }))
      .toHaveAttribute('aria-checked', 'true'));
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({ category_id: 2 });
  });

  it('removes a category with DELETE', async () => {
    mockLoad();
    axiosMock.onDelete(url()).reply(204);
    render(<CategoriesSection courseId={courseId} />);
    await openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Business' }));
    await waitFor(() => expect(screen.getByRole('menuitemcheckbox', { name: 'Business' }))
      .toHaveAttribute('aria-checked', 'false'));
    expect(axiosMock.history.delete[0].params).toEqual({ category_id: 1 });
  });

  it('keeps the selection and shows an error when saving fails', async () => {
    mockLoad();
    axiosMock.onPost(url()).reply(403);
    render(<CategoriesSection courseId={courseId} />);
    await openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Science' }));
    expect(await screen.findByText(/could not be saved/)).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Science' })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows an error with retry when loading fails', async () => {
    axiosMock.onGet(url()).reply(500);
    render(<CategoriesSection courseId={courseId} />);
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    axiosMock.reset();
    mockLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Select categories' })).toBeInTheDocument();
  });

  it('shows the empty state when no categories exist', async () => {
    axiosMock.onGet(url()).reply(200, []);
    render(<CategoriesSection courseId={courseId} />);
    expect(await screen.findByText('No categories are available.')).toBeInTheDocument();
  });
});
