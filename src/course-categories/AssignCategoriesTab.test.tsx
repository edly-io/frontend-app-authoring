import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import AssignCategoriesTab from './AssignCategoriesTab';
import { apiUrls } from './data/api';
import {
  COURSE_ID,
  DRIVING,
  FIRE,
  mockLoaded,
  requestsOf,
  ROAD,
} from './testHelpers';

let axiosMock;

const renderTab = () => render(<AssignCategoriesTab courseId={COURSE_ID} />);
const search = () => screen.findByRole('searchbox', { name: 'Add a category' });

describe('<AssignCategoriesTab />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('shows a spinner while loading', () => {
    mockLoaded(axiosMock);
    renderTab();
    expect(screen.getByText('Loading categories')).toBeInTheDocument(); // the spinner's screen reader text
  });

  it('shows an alert when the categories fail to load', async () => {
    // A 4xx is not retried by the hooks, so the error shows at once.
    axiosMock.onGet(apiUrls.categoriesPage(1)).reply(404);
    axiosMock.onGet(apiUrls.courseCategories(COURSE_ID)).reply(200, []);
    renderTab();
    expect(await screen.findByText(/Categories could not be loaded/)).toBeInTheDocument();
  });

  it('shows an alert when the course categories fail to load', async () => {
    axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, { count: 0, next: null, previous: null, results: [] });
    axiosMock.onGet(apiUrls.courseCategories(COURSE_ID)).reply(403);
    renderTab();
    expect(await screen.findByText(/Categories could not be loaded/)).toBeInTheDocument();
  });

  it('shows the empty states when nothing exists or is assigned', async () => {
    mockLoaded(axiosMock, { categories: [], assigned: [] });
    renderTab();
    expect(await screen.findByText('No categories exist yet.')).toBeInTheDocument();
    expect(screen.getByText('No categories are assigned to this course yet.')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the assigned categories as chips with a remove button', async () => {
    mockLoaded(axiosMock, { assigned: [{ name: ROAD.name, slug: ROAD.slug }] });
    renderTab();
    const list = await screen.findByRole('list', { name: 'Assigned categories' });
    expect(within(list).getByText('Road Safety')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Remove Road Safety' })).toBeInTheDocument();
  });

  it('shows no results until something is typed', async () => {
    mockLoaded(axiosMock);
    renderTab();
    await search();
    expect(screen.queryByRole('list', { name: 'Matching categories' })).not.toBeInTheDocument();
  });

  it('filters the categories case-insensitively as you type', async () => {
    mockLoaded(axiosMock);
    renderTab();
    await userEvent.type(await search(), 'SAFE');
    const results = screen.getByRole('list', { name: 'Matching categories' });
    expect(within(results).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      `Assign ${FIRE.name}`,
      `Assign ${ROAD.name}`,
    ]);
    expect(within(results).queryByText(DRIVING.name)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 matching categories');
  });

  it('narrows the matches as more is typed', async () => {
    mockLoaded(axiosMock);
    renderTab();
    await userEvent.type(await search(), 'road');
    expect(screen.getByRole('status')).toHaveTextContent('1 matching category');
  });

  it('says so when nothing matches', async () => {
    mockLoaded(axiosMock);
    renderTab();
    await userEvent.type(await search(), 'zzz');
    expect(screen.getByText('No matching categories.')).toBeInTheDocument();
  });

  it('disables an assigned category in the results and marks it Assigned', async () => {
    mockLoaded(axiosMock, { assigned: [{ name: ROAD.name, slug: ROAD.slug }] });
    renderTab();
    await userEvent.type(await search(), 'safety');
    const assigned = screen.getByRole('button', { name: 'Road Safety (already assigned)' });
    expect(assigned).toBeDisabled();
    expect(within(assigned).getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign Fire Safety' })).toBeEnabled();
    await userEvent.click(assigned);
    expect(requestsOf(axiosMock, 'post')).toEqual([]);
  });

  it('assigns the clicked category, adds its chip and clears the search', async () => {
    mockLoaded(axiosMock);
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(201, { name: FIRE.name, slug: FIRE.slug });
    renderTab();
    const input = await search();
    await userEvent.type(input, 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Assign Fire Safety' }));
    expect(requestsOf(axiosMock, 'post')).toEqual([[apiUrls.courseCategories(COURSE_ID), { category: 'fire-safety' }]]);
    const chips = await screen.findByRole('list', { name: 'Assigned categories' });
    expect(within(chips).getByText('Fire Safety')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('unassigns from the chip cross and removes the chip', async () => {
    mockLoaded(axiosMock, { assigned: [{ name: ROAD.name, slug: ROAD.slug }] });
    axiosMock.onDelete(apiUrls.courseCategory(COURSE_ID, ROAD.slug)).reply(204);
    renderTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Road Safety' }));
    expect(requestsOf(axiosMock, 'delete')).toEqual([[apiUrls.courseCategory(COURSE_ID, ROAD.slug), undefined]]);
    expect(await screen.findByText('No categories are assigned to this course yet.')).toBeInTheDocument();
  });

  it('shows an alert and no chip when assigning fails', async () => {
    mockLoaded(axiosMock);
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(500);
    renderTab();
    await userEvent.type(await search(), 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Assign Fire Safety' }));
    expect(await screen.findByText('The category could not be assigned. Try again.')).toBeInTheDocument();
    expect(screen.getByText('No categories are assigned to this course yet.')).toBeInTheDocument();
  });

  it('shows an alert and keeps the chip when unassigning fails', async () => {
    mockLoaded(axiosMock, { assigned: [{ name: ROAD.name, slug: ROAD.slug }] });
    axiosMock.onDelete(apiUrls.courseCategory(COURSE_ID, ROAD.slug)).reply(500);
    renderTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Road Safety' }));
    expect(await screen.findByText('The category could not be removed. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Road Safety' })).toBeInTheDocument();
  });

  it('shows the permission message on a 403', async () => {
    mockLoaded(axiosMock);
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(403);
    renderTab();
    await userEvent.type(await search(), 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Assign Fire Safety' }));
    expect(await screen.findByText('You don\'t have permission to make this change.')).toBeInTheDocument();
  });

  it('clears an assign error when the next action starts', async () => {
    mockLoaded(axiosMock, { assigned: [{ name: ROAD.name, slug: ROAD.slug }] });
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(500);
    axiosMock.onDelete(apiUrls.courseCategory(COURSE_ID, ROAD.slug)).reply(204);
    renderTab();
    await userEvent.type(await search(), 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Assign Fire Safety' }));
    await screen.findByText('The category could not be assigned. Try again.');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Road Safety' }));
    await waitFor(() =>
      expect(
        screen.queryByText('The category could not be assigned. Try again.'),
      ).not.toBeInTheDocument()
    );
  });
});
