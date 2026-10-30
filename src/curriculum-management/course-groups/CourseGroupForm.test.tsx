import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import {
  act,
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';
import { page, rawCourseGroups, rawCourses } from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type { CourseGroup } from '../types';
import CourseGroupForm from './CourseGroupForm';

jest.mock('@src/generic/prompt-if-dirty/PromptIfDirty', () => ({ __esModule: true, default: () => null }));

const group = camelCaseObject(rawCourseGroups[0]) as CourseGroup;

const setup = (props: Partial<React.ComponentProps<typeof CourseGroupForm>> = {}) => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  const mocks = initializeMocks();
  mocks.axiosMock.onGet(apiUrls.courses('DRV')).reply(200, page(rawCourses));
  const onClose = jest.fn();
  const onCancel = jest.fn();
  const onDirtyChange = jest.fn();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<CourseGroupForm onClose={onClose} onCancel={onCancel} onDirtyChange={onDirtyChange} {...props} />);
  return {
    ...mocks,
    onClose,
    onCancel,
    onDirtyChange,
    user,
  };
};

const search = async (user: ReturnType<typeof userEvent.setup>, term: string) => {
  await user.type(screen.getByLabelText('Add a course'), term);
  act(() => {
    jest.advanceTimersByTime(400);
  });
};

afterEach(() => jest.useRealTimers());

describe('<CourseGroupForm />', () => {
  it('creates a group: name, Group ID, description and ordered courses, as JSON', async () => {
    const {
      axiosMock,
      onClose,
      mockShowToast,
      user,
    } = setup();
    axiosMock.onPost(apiUrls.courseGroups()).reply(201, rawCourseGroups[0]);
    expect(screen.getByRole('heading', { name: 'New course group' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'EV drivers');
    await user.type(screen.getByLabelText('Group ID'), 'ev-drivers');
    await user.type(screen.getByLabelText('Description (optional)'), 'Electric vehicles.');
    await search(user, 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    await search(user, 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Earnings and payouts' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      slug: 'ev-drivers',
      title: 'EV drivers',
      description: 'Electric vehicles.',
      course_ids: ['course-v1:Uber+DRV101+2026_Q4', 'course-v1:Uber+DRV103+2026_Q4'],
    });
    expect(mockShowToast).toHaveBeenCalledWith('Course group created');
  });

  it('refuses a missing name and a Group ID that breaks the launch rule, sending nothing', async () => {
    const { axiosMock, user } = setup();
    await user.type(screen.getByLabelText('Group ID'), 'EV Drivers');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText(/Use 1 to 64 lowercase letters/)).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('edits: locks the Group ID, keeps a deleted course row, PUTs, and maps a 400 onto rows and fields', async () => {
    const { axiosMock, onClose, user } = setup({ group });
    axiosMock.onPut(apiUrls.courseGroup('ev-drivers')).reply(400, {
      title: ['Too long.'],
      course_ids: { 1: ['Course not found.'] },
    });
    expect(screen.getByRole('heading', { name: 'Edit course group' })).toBeInTheDocument();
    expect(screen.getByLabelText('Group ID')).toHaveAttribute('readonly');
    expect(screen.getByText('The Group ID can\'t change: Uber\'s links name it.')).toBeInTheDocument();
    expect(screen.getByText('Course not found')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect(JSON.parse(axiosMock.history.put[0].data)).toEqual({
      slug: 'ev-drivers',
      title: 'EV drivers',
      description: 'Drivers with an electric vehicle.',
      course_ids: ['course-v1:Uber+DRV101+2026_Q4', 'course-v1:Uber+DRV102+2026_Q4'],
    });
    expect(await screen.findByText('Too long.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Course not found.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the generic error when the save fails for another reason', async () => {
    const { axiosMock, user } = setup({ group });
    axiosMock.onPut(apiUrls.courseGroup('ev-drivers')).reply(500);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('reports dirtiness and asks to cancel', async () => {
    const { onCancel, onDirtyChange, user } = setup();
    await user.type(screen.getByLabelText('Name'), 'x');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
