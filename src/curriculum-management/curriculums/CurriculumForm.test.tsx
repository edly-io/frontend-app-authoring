import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import {
  act,
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';
import {
  page,
  rawBadges,
  rawCourseBadge,
  rawCourses,
  rawCurriculums,
} from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type { Curriculum } from '../types';
import CurriculumForm from './CurriculumForm';

jest.mock('@src/generic/prompt-if-dirty/PromptIfDirty', () => ({ __esModule: true, default: () => null }));

const curriculum = camelCaseObject(rawCurriculums[0]) as Curriculum;

const setup = (props: Partial<React.ComponentProps<typeof CurriculumForm>> = {}) => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  const mocks = initializeMocks();
  mocks.axiosMock.onGet(apiUrls.courses('DRV')).reply(200, page(rawCourses));
  mocks.axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([...rawBadges, rawCourseBadge]));
  const onClose = jest.fn();
  const onCancel = jest.fn();
  const onDirtyChange = jest.fn();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<CurriculumForm onClose={onClose} onCancel={onCancel} onDirtyChange={onDirtyChange} {...props} />);
  return {
    ...mocks,
    onClose,
    onCancel,
    onDirtyChange,
    user,
  };
};

const search = async (user: ReturnType<typeof userEvent.setup>, label: string, term: string) => {
  await user.type(screen.getByLabelText(label), term);
  act(() => {
    jest.advanceTimersByTime(400);
  });
};

afterEach(() => jest.useRealTimers());

describe('<CurriculumForm />', () => {
  it('creates a curriculum: picks courses, the knowledge check (excluding curriculum courses), delay and slots', async () => {
    const {
      axiosMock,
      onClose,
      mockShowToast,
      user,
    } = setup();
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    expect(screen.getByRole('heading', { name: 'New curriculum' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'New driver essentials');
    await search(user, 'Add a course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    await search(user, 'Add a course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Earnings and payouts' }));

    await search(user, 'Knowledge check course', 'DRV');
    // Curriculum courses are not offered as the knowledge check.
    expect(screen.queryByRole('button', { name: 'Add Getting started' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Add Essentials check' }));
    await user.click(screen.getByLabelText('15 days'));
    await screen.findAllByRole('option', { name: 'Road ready' });
    await user.selectOptions(screen.getByLabelText('Retained badge'), rawBadges[2].uuid);

    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      title: 'New driver essentials',
      description: '',
      course_ids: ['course-v1:Uber+DRV101+2026_Q4', 'course-v1:Uber+DRV103+2026_Q4'],
      knowledge_check_course_id: 'course-v1:Uber+DRVKC1+2026_Q4',
      knowledge_check_delay_days: 15,
      badges: { complete: null, retained: rawBadges[2].uuid },
    });
    expect(mockShowToast).toHaveBeenCalledWith('Curriculum created');
  });

  it('shows client-side errors (no title, no courses, no knowledge check) and sends nothing', async () => {
    const { axiosMock, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText('Add at least one course.')).toBeInTheDocument();
    expect(screen.getByText('Choose a knowledge check course.')).toBeInTheDocument();
    expect(screen.queryByText('Choose a badge for this slot.')).not.toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('edits: keeps a deleted course row, PUTs, and maps a server 400 onto fields, rows and the form', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(400, {
      title: ['Ensure this field has no more than 255 characters.'],
      course_ids: { 1: ['Course not found.'] },
      non_field_errors: ['Something general.'],
    });
    expect(screen.getByRole('heading', { name: 'Edit curriculum' })).toBeInTheDocument();
    expect(screen.getByText('Course not found')).toBeInTheDocument();
    expect(screen.getByText('Essentials check')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Ensure this field has no more than 255 characters.')).toBeInTheDocument();
    expect(screen.getByText('Course not found.')).toBeInTheDocument();
    expect(screen.getByText('Something general.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(JSON.parse(axiosMock.history.put[0].data).course_ids).toEqual([
      'course-v1:Uber+DRV101+2026_Q4',
      'course-v1:Uber+DRV102+2026_Q4',
    ]);
  });

  it('shows a generic error for a 500', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(500);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('sends exactly one request on a double-click', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await user.dblClick(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
  });

  it('slot selects list curriculum badges only, offer "No badge", and disable a badge taken by another slot', async () => {
    const { user } = setup();
    await screen.findAllByRole('option', { name: 'Road ready' });
    const complete = screen.getByLabelText('Complete badge');
    expect(within(complete).getByRole('option', { name: 'No badge' })).toHaveValue('');
    expect(within(complete).queryByRole('option', { name: 'Airport pro' })).not.toBeInTheDocument();
    await user.selectOptions(complete, rawBadges[0].uuid);
    expect(within(screen.getByLabelText('Retained badge')).getByRole('option', { name: 'Road ready' }))
      .toBeDisabled();
  });

  it('prefills the slots when editing and sends null for a slot set to "No badge"', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await screen.findAllByRole('option', { name: 'Road ready' });
    expect(screen.getByLabelText('Complete badge')).toHaveValue(rawBadges[0].uuid);
    await user.selectOptions(screen.getByLabelText('Retained badge'), '');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(axiosMock.history.put[0].data).badges).toEqual({
      complete: rawBadges[0].uuid,
      retained: null,
    });
  });

  it('links to the Badges tab to create a badge', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Create a badge' })).toHaveAttribute(
      'href',
      '/curriculum-management/badges',
    );
  });

  it('maps a server badges.<slot> error onto that slot', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(400, { badges: { retained: ['Badge not found.'] } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Badge not found.')).toBeInTheDocument();
  });

  it('opens in its own modal', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'New curriculum' })).toContainElement(
      screen.getByTestId('curriculum-form'),
    );
  });

  it('reports dirty state; Cancel and the close button ask to cancel', async () => {
    const {
      onCancel,
      onClose,
      onDirtyChange,
      user,
    } = setup({ curriculum });
    await user.type(screen.getByLabelText('Title'), '!');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Change" clears the knowledge check so a new one can be picked', async () => {
    const { user } = setup({ curriculum });
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Knowledge check course')).toBeInTheDocument();
  });

  it('"Change" moves focus to the knowledge check search, and picking one moves it to "Change"', async () => {
    const { user } = setup({ curriculum });
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Knowledge check course')).toHaveFocus();
    await search(user, 'Knowledge check course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Essentials check' }));
    expect(screen.getByRole('button', { name: 'Change' })).toHaveFocus();
  });

  it('after picking a course, focus stays in the course search; after removing the last one it returns there', async () => {
    const { user } = setup();
    await search(user, 'Add a course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remove Getting started' }));
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
  });

  it('ties the courses and knowledge-check errors to their inputs', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('Add at least one course.');
    expect(screen.getByLabelText('Add a course')).toHaveAccessibleDescription('Add at least one course.');
    expect(screen.getByLabelText('Knowledge check course'))
      .toHaveAccessibleDescription(expect.stringContaining('Choose a knowledge check course.'));
  });

  it('ties a server knowledge-check error to "Change" while one is selected', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(400, { knowledge_check_course_id: ['Course not found.'] });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Course not found.');
    expect(screen.getByRole('button', { name: 'Change' })).toHaveAccessibleDescription('Course not found.');
  });
});
