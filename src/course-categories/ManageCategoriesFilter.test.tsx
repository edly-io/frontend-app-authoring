import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import { apiUrls } from './data/api';
import ManageCategoriesTab from './ManageCategoriesTab';
import {
  DRIVING,
  FIRE,
  mockLoaded,
  requestsOf,
  ROAD,
} from './testHelpers';

let axiosMock;

const renderTab = async () => {
  render(<ManageCategoriesTab />);
  return screen.findByRole('searchbox', { name: 'Search all categories' });
};
const rows = () => within(screen.getByRole('list', { name: 'All categories' })).getAllByRole('listitem');

describe('<ManageCategoriesTab /> search and scroll region', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('shows every category before anything is typed, with no match announcement', async () => {
    mockLoaded(axiosMock);
    await renderTab();
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('filters by partial match', async () => {
    mockLoaded(axiosMock);
    await userEvent.type(await renderTab(), 'safe');
    expect(rows().map((li) => li.textContent)).toEqual([
      expect.stringContaining('Fire Safety'),
      expect.stringContaining('Road Safety'),
    ]);
    expect(screen.queryByText('Driving')).not.toBeInTheDocument();
  });

  it('is case-insensitive', async () => {
    mockLoaded(axiosMock);
    await userEvent.type(await renderTab(), 'dRiVi');
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Driving')).toBeInTheDocument();
  });

  it('trims the query', async () => {
    mockLoaded(axiosMock);
    await userEvent.type(await renderTab(), '  ROAD ');
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Road Safety')).toBeInTheDocument();
  });

  it('shows all categories for a whitespace-only query', async () => {
    mockLoaded(axiosMock);
    await userEvent.type(await renderTab(), '   ');
    expect(rows()).toHaveLength(3);
    expect(screen.queryByText(/No categories match/)).not.toBeInTheDocument();
  });

  it('shows a no-match state with the trimmed query and no list', async () => {
    mockLoaded(axiosMock);
    await userEvent.type(await renderTab(), ' zzz ');
    expect(screen.getByText('No categories match "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'All categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Scrollable list of categories' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matching categories');
  });

  it('does not show the no-match text for an empty system, only the original empty state', async () => {
    mockLoaded(axiosMock, { categories: [] });
    render(<ManageCategoriesTab />);
    expect(await screen.findByText('No categories exist yet.')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Search all categories' })).not.toBeInTheDocument();
    expect(screen.queryByText(/No categories match/)).not.toBeInTheDocument();
  });

  it('announces the match count for screen readers', async () => {
    mockLoaded(axiosMock);
    const input = await renderTab();
    await userEvent.type(input, 'safety');
    expect(screen.getByRole('status')).toHaveTextContent('2 matching categories');
    await userEvent.clear(input);
    await userEvent.type(input, 'road');
    expect(screen.getByRole('status')).toHaveTextContent('1 matching category');
  });

  it('restores the full list and clears the announcement when the query is cleared', async () => {
    mockLoaded(axiosMock);
    const input = await renderTab();
    await userEvent.type(input, 'zzz');
    await userEvent.clear(input);
    expect(rows()).toHaveLength(3);
    expect(screen.queryByText(/No categories match/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('renames a category on a filtered row, and drops it when it no longer matches', async () => {
    mockLoaded(axiosMock);
    axiosMock.onPatch(apiUrls.category(ROAD.slug)).reply(200, { ...ROAD, name: 'Highway Code' });
    await userEvent.type(await renderTab(), 'road');
    await userEvent.click(screen.getByRole('button', { name: 'Rename Road Safety' }));
    const field = screen.getByRole('textbox', { name: 'Name of Road Safety' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Highway Code');
    // The list is refetched after the rename.
    axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, {
      count: 3,
      next: null,
      previous: null,
      results: [DRIVING, FIRE, { ...ROAD, name: 'Highway Code' }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(requestsOf(axiosMock, 'patch')).toEqual([
        [apiUrls.category('road-safety'), { name: 'Highway Code' }],
      ])
    );
    await waitFor(() => expect(screen.queryByText('Highway Code')).not.toBeInTheDocument());
    expect(screen.getByText('No categories match "road".')).toBeInTheDocument();
  });

  it('deletes a category on a filtered row and shows the notice', async () => {
    mockLoaded(axiosMock);
    axiosMock.onDelete(apiUrls.category(FIRE.slug)).reply(204);
    await userEvent.type(await renderTab(), 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Fire Safety' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete "Fire Safety"?' });
    // Rendered in its own portal, so it carries the scoped class itself.
    expect(dialog.closest('.course-categories-modal')).not.toBeNull();
    axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, {
      count: 2,
      next: null,
      previous: null,
      results: [DRIVING, ROAD],
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted "Fire Safety".')).toBeInTheDocument();
    expect(requestsOf(axiosMock, 'delete')).toEqual([[apiUrls.category('fire-safety'), undefined]]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Delete Fire Safety' })).not.toBeInTheDocument());
    expect(screen.getByText('No categories match "fire".')).toBeInTheDocument();
  });

  it('puts the list in a labelled, focusable scroll region', async () => {
    mockLoaded(axiosMock);
    await renderTab();
    const region = screen.getByRole('region', { name: 'Scrollable list of categories' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('course-categories-list');
    expect(within(region).getByRole('list', { name: 'All categories' })).toBeInTheDocument();
  });

  it('keeps the search field outside the scroll region so it stays put', async () => {
    mockLoaded(axiosMock);
    const input = await renderTab();
    expect(screen.getByRole('region', { name: 'Scrollable list of categories' })).not.toContainElement(input);
  });

  it('can be reached by keyboard: the region takes focus on Tab from the search field', async () => {
    mockLoaded(axiosMock);
    const input = await renderTab();
    input.focus();
    await userEvent.tab();
    expect(screen.getByRole('region', { name: 'Scrollable list of categories' })).toHaveFocus();
  });

  it('stacks the add-form on small screens with responsive classes', async () => {
    mockLoaded(axiosMock);
    await renderTab();
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toHaveClass('mt-2', 'mt-sm-0', 'ml-sm-2');
    expect(create.parentElement).toHaveClass('flex-column', 'flex-sm-row');
  });

  it('stacks the rename field and Save/Cancel on small screens', async () => {
    mockLoaded(axiosMock);
    await renderTab();
    await userEvent.click(screen.getByRole('button', { name: 'Rename Road Safety' }));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save.parentElement).toHaveClass('mt-2', 'mt-sm-0', 'ml-sm-2');
    expect(save.parentElement?.parentElement).toHaveClass('flex-column', 'flex-sm-row');
  });
});
