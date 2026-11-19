import { camelCaseObject, mergeConfig } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import {
  act,
  fireEvent,
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

type User = ReturnType<typeof userEvent.setup>;

const slotToggle = (slot: 'Complete' | 'Retained') => screen.getByLabelText(new RegExp(`^${slot} badge`));

/** Opens a slot's dropdown once the badges have loaded and returns its menu items. */
const openSlot = async (user: User, slot: 'Complete' | 'Retained') => {
  await user.click(slotToggle(slot));
  const menu = slotToggle(slot).closest('.dropdown') as HTMLElement;
  await waitFor(() => expect(menu.querySelectorAll('.dropdown-item').length).toBeGreaterThan(1));
  return within(menu);
};

const chooseBadge = async (user: User, slot: 'Complete' | 'Retained', title: string) => {
  const menu = await openSlot(user, slot);
  await user.click(menu.getByTitle(title));
};

/** New forms show their sections once a type is picked (UBER-351). */
const pickType = async (user: User, type: 'Learning path' | 'Course') => {
  await user.click(screen.getByRole('radio', { name: type }));
};

afterEach(() => jest.useRealTimers());

describe('<CurriculumForm />', () => {
  it('starts a new form with no type chosen and shows the rest only once one is picked', async () => {
    const { user } = setup();
    expect(screen.getByRole('radio', { name: 'Learning path' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Course' })).not.toBeChecked();
    expect(screen.queryByLabelText('Add a course')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Knowledge check course')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Complete badge/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Course' }));
    expect(screen.getByLabelText('Add a course')).toBeInTheDocument();
    expect(screen.getByLabelText('Knowledge check course')).toBeInTheDocument();
    // A single course gets singular wording.
    expect(screen.getByText('The course learners take.')).toBeInTheDocument();
    expect(screen.getByText('No course yet')).toBeInTheDocument();
    expect(screen.getAllByText('Can\'t be the course above.').length).toBeGreaterThan(0);
  });

  it('asks for a type when saving without one', async () => {
    const { axiosMock, user } = setup();
    await user.type(screen.getByLabelText('Title'), 'Night driving');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Choose Learning path or Course.')).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('creates a curriculum: picks courses, the knowledge check (excluding curriculum courses), delay and slots', async () => {
    const {
      axiosMock,
      onClose,
      mockShowToast,
      user,
    } = setup();
    await pickType(user, 'Learning path');
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    expect(screen.getByRole('heading', { name: 'New learning path' })).toBeInTheDocument();

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
    await chooseBadge(user, 'Complete', rawBadges[1].title);

    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const postBody = axiosMock.history.post[0].data as FormData;
    expect(postBody.get('title')).toEqual('New driver essentials');
    expect(postBody.get('slug')).toEqual('new-driver-essentials');
    expect(postBody.get('description')).toEqual('');
    expect(postBody.getAll('course_ids')).toEqual([
      'course-v1:Uber+DRV101+2026_Q4',
      'course-v1:Uber+DRV103+2026_Q4',
    ]);
    expect(postBody.get('knowledge_check_course_id')).toEqual('course-v1:Uber+DRVKC1+2026_Q4');
    expect(postBody.get('knowledge_check_delay_days')).toEqual('15');
    expect(postBody.get('badges.complete')).toEqual(rawBadges[1].uuid);
    expect(postBody.has('badges.retained')).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Learning path created');
  });

  it('suggests the learning path ID from the title until it is edited, and refuses a bad one', async () => {
    const { axiosMock, user } = setup();
    await user.type(screen.getByLabelText('Title'), 'Road safety: night & day');
    expect(screen.getByLabelText('Learning path ID')).toHaveValue('road-safety-night-day');
    await user.clear(screen.getByLabelText('Learning path ID'));
    await user.type(screen.getByLabelText('Learning path ID'), 'Road Safety');
    await user.type(screen.getByLabelText('Title'), '!');
    expect(screen.getByLabelText('Learning path ID')).toHaveValue('Road Safety');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText(/Use 1 to 64 lowercase letters/)).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('locks the learning path ID on the edit form and never sends it', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    expect(screen.getByLabelText('Learning path ID')).toHaveValue('new-driver-essentials');
    expect(screen.getByLabelText('Learning path ID')).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect((axiosMock.history.put[0].data as FormData).get('slug')).toEqual('new-driver-essentials');
  });

  it('shows client-side errors (no title, no courses, no knowledge check) and sends nothing', async () => {
    const { axiosMock, user } = setup();
    await pickType(user, 'Learning path');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText('Add at least one course.')).toBeInTheDocument();
    // The knowledge check is optional (UBER-351).
    expect(screen.queryByText('Choose a knowledge check course.')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose a badge for this slot.')).not.toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('prefills the knowledge check settings with the defaults for a new curriculum', async () => {
    const { user } = setup();
    await pickType(user, 'Learning path');
    await search(user, 'Knowledge check course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Essentials check' }));
    expect(screen.getByLabelText('Pass mark (%)')).toHaveValue(80);
    expect(screen.getByLabelText('Maximum attempts')).toHaveValue(1);
    expect(screen.getByLabelText('Time limit (minutes, optional)')).toHaveValue(null);
  });

  it('validates the knowledge check settings: required, range, at least 1 and whole numbers', async () => {
    const { axiosMock, user } = setup({ curriculum });
    await user.clear(screen.getByLabelText('Pass mark (%)'));
    await user.clear(screen.getByLabelText('Maximum attempts'));
    await user.type(screen.getByLabelText('Time limit (minutes, optional)'), '0');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a pass mark between 1 and 100.')).toBeInTheDocument();
    expect(screen.getByText('Enter the maximum number of attempts.')).toBeInTheDocument();
    expect(screen.getByText('Enter 1 or more.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Pass mark (%)'), '101');
    expect(await screen.findByText('Enter a pass mark between 1 and 100.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Maximum attempts'), '1.5');
    expect(await screen.findByText('Enter a whole number.')).toBeInTheDocument();
    expect(axiosMock.history.put).toHaveLength(0);

    // Each error clears as soon as its value is fixed.
    await user.clear(screen.getByLabelText('Pass mark (%)'));
    await user.type(screen.getByLabelText('Pass mark (%)'), '100');
    await user.clear(screen.getByLabelText('Maximum attempts'));
    await user.type(screen.getByLabelText('Maximum attempts'), '3');
    await user.clear(screen.getByLabelText('Time limit (minutes, optional)'));
    await waitFor(() => expect(screen.queryByText('Enter 1 or more.')).not.toBeInTheDocument());
    expect(screen.queryByText('Enter a pass mark between 1 and 100.')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter a whole number.')).not.toBeInTheDocument();
  });

  it('sends edited knowledge check settings, and an emptied optional one as blank', async () => {
    const withLimits = { ...curriculum, knowledgeCheckTimeLimit: 20 };
    const { axiosMock, onClose, user } = setup({ curriculum: withLimits });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    expect(screen.getByLabelText('Time limit (minutes, optional)')).toHaveValue(20);
    await user.clear(screen.getByLabelText('Pass mark (%)'));
    await user.type(screen.getByLabelText('Pass mark (%)'), '70');
    await user.clear(screen.getByLabelText('Maximum attempts'));
    await user.type(screen.getByLabelText('Maximum attempts'), '2');
    await user.clear(screen.getByLabelText('Time limit (minutes, optional)'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const putBody = axiosMock.history.put[0].data as FormData;
    expect(putBody.get('knowledge_check_pass_threshold')).toEqual('70');
    expect(putBody.get('knowledge_check_max_attempts')).toEqual('2');
    expect(putBody.get('knowledge_check_time_limit')).toEqual('');
  });

  it('creates a learning path without a knowledge check, sending a blank one', async () => {
    const { axiosMock, onClose, user } = setup();
    await pickType(user, 'Learning path');
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    await user.type(screen.getByLabelText('Title'), 'Night driving');
    await search(user, 'Add a course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const postBody = axiosMock.history.post[0].data as FormData;
    expect(postBody.get('kind')).toEqual('learning_path');
    expect(postBody.get('knowledge_check_course_id')).toEqual('');
  });

  it('Course type allows one course: the course search goes away once one is added', async () => {
    const { axiosMock, onClose, user } = setup();
    axiosMock.onPost(apiUrls.curriculums()).reply(201, rawCurriculums[0]);
    await user.click(screen.getByRole('radio', { name: 'Course' }));
    await user.type(screen.getByLabelText('Title'), 'Airport pickups');
    await search(user, 'Add a course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    expect(screen.queryByLabelText('Add a course')).not.toBeInTheDocument();
    // No Complete badge for a course, and Retained is a stock trophy: no badges section at all.
    expect(screen.queryByText('Need a new badge?', { exact: false })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((axiosMock.history.post[0].data as FormData).get('kind')).toEqual('course');
  });

  it('locks the type on edit, so a saved learning path can\'t be switched to Course', () => {
    setup({ curriculum });
    expect(screen.getByRole('radio', { name: 'Learning path' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Learning path' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Course' })).toBeDisabled();
    expect(screen.getByText('The type can\'t change after the first save.')).toBeInTheDocument();
  });

  it('hides the knowledge check settings until a knowledge check is picked', () => {
    setup();
    expect(screen.queryByLabelText('Pass mark (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('15 days')).not.toBeInTheDocument();
  });

  it('has no Retained slot, and sends no Retained badge once the knowledge check is removed', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    expect(slotToggle('Complete')).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^Retained badge/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const putBody = axiosMock.history.put[0].data as FormData;
    expect(putBody.get('knowledge_check_course_id')).toEqual('');
    expect(putBody.has('badges.retained')).toBe(false);
  });

  it('counts title and description characters and caps them at 50 and 500', async () => {
    const { user } = setup();
    expect(screen.getByLabelText('Title')).toHaveAttribute('maxlength', '50');
    expect(screen.getByLabelText('Description (optional)')).toHaveAttribute('maxlength', '500');
    await user.type(screen.getByLabelText('Title'), 'Driver basics');
    expect(screen.getByText('13 / 50')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Description (optional)'), 'Short.');
    expect(screen.getByText('6 / 500')).toBeInTheDocument();
  });

  it('blocks saving a saved description over 500 characters', async () => {
    const { axiosMock, user } = setup({ curriculum: { ...curriculum, description: 'y'.repeat(501) } });
    expect(screen.getByText('501 / 500')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Use 500 characters or fewer.')).toBeInTheDocument();
    expect(axiosMock.history.put).toHaveLength(0);
  });

  it('moves focus to the first invalid field after a failed save', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus());
  });

  it('edits: keeps a deleted course row, PUTs, and maps a server 400 onto fields, rows and the form', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(400, {
      title: ['Ensure this field has no more than 50 characters.'],
      course_ids: { 1: ['Course not found.'] },
      non_field_errors: ['Something general.'],
    });
    expect(screen.getByRole('heading', { name: 'Edit learning path' })).toBeInTheDocument();
    expect(screen.getByText('Course not found')).toBeInTheDocument();
    expect(screen.getByText('Essentials check')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Ensure this field has no more than 50 characters.')).toBeInTheDocument();
    expect(screen.getByText('Course not found.')).toBeInTheDocument();
    expect(screen.getByText('Something general.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect((axiosMock.history.put[0].data as FormData).getAll('course_ids')).toEqual([
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

  it('slot selects list curriculum badges only and offer "No badge"', async () => {
    const { user } = setup();
    await pickType(user, 'Learning path');
    const complete = await openSlot(user, 'Complete');
    expect(complete.getAllByTitle('No badge')[0]).toHaveClass('dropdown-item');
    expect(complete.queryByTitle('Airport pro')).not.toBeInTheDocument();
    await user.click(complete.getByTitle(rawBadges[1].title));
    expect(slotToggle('Complete')).toHaveAccessibleName(`Complete badge ${rawBadges[1].title}`);
  });

  it('slot selects leave out badges another curriculum uses, but keep this curriculum\'s own', async () => {
    const { user } = setup();
    await pickType(user, 'Learning path');
    const complete = await openSlot(user, 'Complete');
    expect(complete.getByTitle('Essentials complete')).toBeInTheDocument();
    expect(complete.queryByTitle('Road ready')).not.toBeInTheDocument();
  });

  it('prefills the slots when editing and sends null for a slot set to "No badge"', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await waitFor(() => expect(slotToggle('Complete')).toHaveAccessibleName(`Complete badge ${rawBadges[0].title}`));
    await chooseBadge(user, 'Complete', 'No badge');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const putBody = axiosMock.history.put[0].data as FormData;
    expect(putBody.has('badges.complete')).toBe(false);
    // A Retained badge attached before it became a stock trophy is hidden but left as it is.
    expect(putBody.get('badges.retained')).toEqual(rawBadges[2].uuid);
  });

  it('makes an earned slot read-only with a note, and still sends its badge', async () => {
    const earned = {
      ...curriculum,
      badges: { ...curriculum.badges, complete: { ...curriculum.badges.complete!, earned: true } },
    };
    const { axiosMock, onClose, user } = setup({ curriculum: earned });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    expect(slotToggle('Complete')).toBeDisabled();
    expect(screen.getAllByText(
      'Learners have earned this badge in this learning path, so this slot\'s badge can\'t change.',
    )).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((axiosMock.history.put[0].data as FormData).get('badges.complete')).toEqual(rawBadges[0].uuid);
  });

  it('links to the Badges tab in a new tab, so unsaved edits are kept', async () => {
    const { user } = setup();
    await pickType(user, 'Learning path');
    const link = screen.getByRole('link', { name: 'Create a badge here, on the Badges tab (opens in a new tab)' });
    expect(link).toHaveAttribute('href', '/curriculum-management/badges');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('maps a server badges.<slot> error onto that slot', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(400, { badges: { complete: ['Badge not found.'] } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Badge not found.')).toBeInTheDocument();
  });

  it('opens in its own modal', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'New learning path' })).toContainElement(
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
    await pickType(user, 'Learning path');
    await search(user, 'Add a course', 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remove Getting started' }));
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
  });

  it('ties the courses error to its input', async () => {
    const { user } = setup();
    await pickType(user, 'Learning path');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('Add at least one course.');
    expect(screen.getByLabelText('Add a course')).toHaveAccessibleDescription('Add at least one course.');
  });

  it('ties a server knowledge-check error to "Change" while one is selected', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(400, { knowledge_check_course_id: ['Course not found.'] });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Course not found.');
    expect(screen.getByRole('button', { name: 'Change' })).toHaveAccessibleDescription('Course not found.');
  });

  it('shows image preview when curriculum has an imageUrl', () => {
    setup({ curriculum });
    expect(screen.getByRole('img', { name: curriculum.title })).toHaveAttribute('src', curriculum.imageUrl);
  });

  it('clicking "Remove image" sends remove_image=true in the PUT body', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await user.click(screen.getByRole('button', { name: 'Remove image' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = axiosMock.history.put[0].data as FormData;
    expect(body.get('remove_image')).toEqual('true');
    expect(body.has('image')).toBe(false);
  });

  it('picking a new image file sends it in the PUT body', async () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:preview');
    global.URL.revokeObjectURL = jest.fn();
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      file,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = axiosMock.history.put[0].data as FormData;
    expect(body.get('image')).toBe(file);
    expect(body.has('remove_image')).toBe(false);
  });

  it('Dropzone rejects an invalid file type and shows the type error', async () => {
    const { user } = setup();
    await pickType(user, 'Learning path');
    fireEvent.drop(screen.getByTestId('curriculum-image-dropzone'), {
      dataTransfer: {
        files: [new File(['<bad>'], 'evil.pdf', { type: 'application/pdf' })],
        items: [{
          kind: 'file',
          type: 'application/pdf',
          getAsFile: () => new File(['<bad>'], 'evil.pdf', { type: 'application/pdf' }),
        }],
        types: ['Files'],
      },
    });
    expect(await screen.findByText('Upload a PNG or JPG image.')).toBeInTheDocument();
  });

  it('does not send image or remove_image when the image field is untouched', async () => {
    const { axiosMock, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    const body = axiosMock.history.put[0].data as FormData;
    expect(body.has('image')).toBe(false);
    expect(body.has('remove_image')).toBe(false);
  });
});

describe('<CurriculumForm /> with ENABLE_RETAINED_BADGE_SLOT on', () => {
  beforeEach(() => mergeConfig({ ENABLE_RETAINED_BADGE_SLOT: true }));
  afterEach(() => mergeConfig({ ENABLE_RETAINED_BADGE_SLOT: false }));

  it('shows the Retained slot, disabled without a knowledge check, and sends none on save', async () => {
    const { axiosMock, onClose, user } = setup({ curriculum });
    axiosMock.onPut(apiUrls.curriculum('cur-1')).reply(200, rawCurriculums[0]);
    expect(slotToggle('Retained')).toBeEnabled();
    expect(screen.getByText('Optional. Without one, there is no Retained badge.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(slotToggle('Retained')).toBeDisabled();
    expect(screen.getByText('Choose a knowledge check course to use the Retained badge.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((axiosMock.history.put[0].data as FormData).has('badges.retained')).toBe(false);
  });

  it('lets a course pick a Retained badge', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Course' }));
    expect(slotToggle('Retained')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Complete badge/ })).not.toBeInTheDocument();
  });
});
