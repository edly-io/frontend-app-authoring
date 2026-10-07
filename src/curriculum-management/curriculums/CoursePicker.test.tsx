import userEvent from '@testing-library/user-event';
import {
  act,
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';
import { page, rawCourses } from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import CoursePicker from './CoursePicker';

describe('<CoursePicker />', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = (props: Partial<React.ComponentProps<typeof CoursePicker>> = {}) => {
    const { axiosMock } = initializeMocks();
    axiosMock.onGet(apiUrls.courses('DRV')).reply(200, page(rawCourses));
    const onSelect = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <CoursePicker id="picker" label="Add a course" excludedCourseIds={[]} onSelect={onSelect} {...props} />,
    );
    return { axiosMock, onSelect, user };
  };

  it('debounces the search (one request after 400 ms) and lists name + key', async () => {
    const { axiosMock, user } = setup();
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    expect(axiosMock.history.get.filter((r) => r.url?.includes('/courses/'))).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(await screen.findByText('Earnings and payouts')).toBeInTheDocument();
    expect(screen.getByText('course-v1:Uber+DRV103+2026_Q4')).toBeInTheDocument();
    expect(axiosMock.history.get.filter((r) => r.url?.includes('/courses/'))).toHaveLength(1);
  });

  it('marks added courses as disabled "Added" and hides excluded ones', async () => {
    const { user } = setup({
      addedCourseIds: ['course-v1:Uber+DRV101+2026_Q4'],
      excludedCourseIds: ['course-v1:Uber+DRVKC1+2026_Q4'],
    });
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(await screen.findByRole('button', { name: 'Getting started is already added' })).toBeDisabled();
    expect(screen.queryByText('Essentials check')).not.toBeInTheDocument();
  });

  it('calls onSelect and clears the input after a pick', async () => {
    const { onSelect, user } = setup();
    const input = screen.getByLabelText('Add a course');
    await user.type(input, 'DRV');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await user.click(await screen.findByRole('button', { name: 'Add Earnings and payouts' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ courseId: 'course-v1:Uber+DRV103+2026_Q4' }));
    expect(input).toHaveValue('');
    expect(screen.queryByRole('list', { name: 'Matching courses' })).not.toBeInTheDocument();
  });

  it('returns focus to the search input after a pick, so it does not fall to <body>', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await user.click(await screen.findByRole('button', { name: 'Add Earnings and payouts' }));
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
  });

  it('focuses the search input on mount when asked to', () => {
    setup({ autoFocus: true });
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
  });

  it('does not take focus on mount by default', () => {
    setup();
    expect(screen.getByLabelText('Add a course')).not.toHaveFocus();
  });

  it('links its error to the search input', () => {
    setup({ error: 'Add at least one course.' });
    expect(screen.getByLabelText('Add a course')).toHaveAccessibleDescription('Add at least one course.');
  });

  it('sends no request and shows no list for a whitespace-only term', async () => {
    const { axiosMock, user } = setup();
    await user.type(screen.getByLabelText('Add a course'), '   ');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => expect(axiosMock.history.get.filter((r) => r.url?.includes('/courses/'))).toHaveLength(0));
    expect(screen.queryByRole('list', { name: 'Matching courses' })).not.toBeInTheDocument();
  });

  it('shows "No matching courses"', async () => {
    const { axiosMock, user } = setup();
    axiosMock.onGet(apiUrls.courses('zzz')).reply(200, page([]));
    await user.type(screen.getByLabelText('Add a course'), 'zzz');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    const list = await screen.findByRole('list', { name: 'Matching courses' });
    expect(await within(list).findByText('No matching courses')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matching courses');
  });

  it('announces the number of matching courses to screen readers', async () => {
    const { user } = setup({ excludedCourseIds: ['course-v1:Uber+DRVKC1+2026_Q4'] });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 matching courses'));
  });

  it.each([403, 500])('shows an error, not "No matching courses", when the search fails with %s', async (code) => {
    const { axiosMock, user } = setup();
    axiosMock.onGet(apiUrls.courses('zzz')).reply(code);
    await user.type(screen.getByLabelText('Add a course'), 'zzz');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => expect(axiosMock.history.get.filter((r) => r.url?.includes('zzz'))).toHaveLength(1));
    // A 500 is retried with backoff (1 s, 2 s, 4 s) before the query errors; a 403 is not retried.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Couldn\'t search courses. Please try again.');
    });
    expect(screen.getAllByText('Couldn\'t search courses. Please try again.')).toHaveLength(2); // visible + status
    expect(screen.queryByText('No matching courses')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Matching courses' })).not.toBeInTheDocument();
  });
});
