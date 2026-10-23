import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
} from '@src/testUtils';

import AssignCategoriesTab from './AssignCategoriesTab';
import { apiUrls } from './data/api';
import {
  COURSE_ID,
  FIRE,
  mockLoaded,
  ROAD,
} from './testHelpers';

let axiosMock;

const chip = ({ name, slug }: { name: string; slug: string; }) => ({ name, slug });

describe('<AssignCategoriesTab /> summary line', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('says the named course has no categories', async () => {
    mockLoaded(axiosMock);
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName="Intro to Driving" />);
    expect(await screen.findByText('"Intro to Driving" has no categories yet.')).toBeInTheDocument();
  });

  it('uses the singular for one category and shows the course name', async () => {
    mockLoaded(axiosMock, { assigned: [chip(ROAD)] });
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName="Intro to Driving" />);
    expect(await screen.findByText('"Intro to Driving" has 1 category.')).toBeInTheDocument();
  });

  it('uses the plural for several categories', async () => {
    mockLoaded(axiosMock, { assigned: [chip(ROAD), chip(FIRE)] });
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName="Intro to Driving" />);
    expect(await screen.findByText('"Intro to Driving" has 2 categories.')).toBeInTheDocument();
  });

  it.each([
    [[], 'This course has no categories yet.'],
    [[chip(ROAD)], 'This course has 1 category.'],
    [[chip(ROAD), chip(FIRE)], 'This course has 2 categories.'],
  ])('falls back to "This course" when the name is missing (%#)', async (assigned, text) => {
    mockLoaded(axiosMock, { assigned });
    render(<AssignCategoriesTab courseId={COURSE_ID} />);
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('falls back to "This course" when the name is an empty string', async () => {
    mockLoaded(axiosMock);
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName="" />);
    expect(await screen.findByText('This course has no categories yet.')).toBeInTheDocument();
  });

  it('updates the count after assigning and after unassigning', async () => {
    mockLoaded(axiosMock);
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(201, chip(FIRE));
    axiosMock.onDelete(apiUrls.courseCategory(COURSE_ID, FIRE.slug)).reply(204);
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName="Intro to Driving" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Add a category' }), 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Assign Fire Safety' }));
    expect(await screen.findByText('"Intro to Driving" has 1 category.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Fire Safety' }));
    expect(await screen.findByText('"Intro to Driving" has no categories yet.')).toBeInTheDocument();
  });

  it('keeps the count when assigning fails', async () => {
    mockLoaded(axiosMock);
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(500);
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName="Intro to Driving" />);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Add a category' }), 'fire');
    await userEvent.click(screen.getByRole('button', { name: 'Assign Fire Safety' }));
    await screen.findByText('The category could not be assigned. Try again.');
    expect(screen.getByText('"Intro to Driving" has no categories yet.')).toBeInTheDocument();
  });

  it('wraps long names with text-break so the dialog does not widen', async () => {
    mockLoaded(axiosMock);
    render(<AssignCategoriesTab courseId={COURSE_ID} courseName={'A'.repeat(200)} />);
    expect(await screen.findByText(/has no categories yet/)).toHaveClass('text-break');
  });

  it('shows a cut-off chip name in full in a tooltip on hover', async () => {
    mockLoaded(axiosMock, { assigned: [chip(ROAD)] });
    render(<AssignCategoriesTab courseId={COURSE_ID} />);
    const name = await screen.findByText('Road Safety');
    expect(name.closest('li')).toHaveClass('course-categories-chip-item');
    // jsdom has no layout: make the chip's label clip the name, as a browser does for a long one.
    Object.defineProperty(name.parentElement, 'scrollWidth', { configurable: true, value: 300 });
    Object.defineProperty(name.parentElement, 'clientWidth', { configurable: true, value: 100 });

    await userEvent.hover(name);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Road Safety');
  });
});
