import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import {
  act,
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';
import {
  rawCourseGroups,
  rawCourses,
  rawCurriculums,
  rawDeepLinks,
  rawDeepLinksConfig,
} from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type {
  CourseGroup,
  Curriculum,
  DeepLink,
  DeepLinksConfig,
} from '../types';
import DeepLinkForm from './DeepLinkForm';

jest.mock('@src/generic/prompt-if-dirty/PromptIfDirty', () => ({ __esModule: true, default: () => null }));

const link = camelCaseObject(rawDeepLinks[0]) as DeepLink;
const config = camelCaseObject(rawDeepLinksConfig()) as DeepLinksConfig;
const rawSecondPath = { ...rawCurriculums[0], uuid: 'cur-2', slug: 'road-safety', title: 'Road safety' };
const paths = camelCaseObject([rawCurriculums[0], rawSecondPath]) as Curriculum[];
const groups = camelCaseObject(rawCourseGroups) as CourseGroup[];

const setup = (props: Partial<React.ComponentProps<typeof DeepLinkForm>> = {}) => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  const mocks = initializeMocks();
  mocks.axiosMock.onGet(apiUrls.courses('DRV')).reply(200, {
    count: 3,
    next: null,
    previous: null,
    results: rawCourses,
  });
  const onClose = jest.fn();
  const onCancel = jest.fn();
  const onDirtyChange = jest.fn();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(
    <DeepLinkForm
      config={config}
      paths={paths}
      groups={groups}
      onClose={onClose}
      onCancel={onCancel}
      onDirtyChange={onDirtyChange}
      {...props}
    />,
  );
  return {
    ...mocks,
    onClose,
    onCancel,
    onDirtyChange,
    user,
  };
};

const pickCourse = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Search courses'), 'DRV');
  act(() => {
    jest.advanceTimersByTime(400);
  });
  await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
};

/** Picks an option of a searchable multi-select by typing part of its label and pressing Enter. */
const pick = async (user: ReturnType<typeof userEvent.setup>, label: string, text: string) => {
  await user.type(screen.getByLabelText(label), text);
  await user.keyboard('{Enter}');
};

const preview = () => screen.getByTestId('app-link-preview');

afterEach(() => jest.useRealTimers());

describe('<DeepLinkForm />', () => {
  it('starts as a bare home link and previews what each step adds', async () => {
    const { user } = setup();
    expect(screen.getByRole('heading', { name: 'New deep link' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Home page' })).toBeChecked();
    expect(preview()).toHaveTextContent('uber://learn?target=home');
    await pickCourse(user);
    expect(preview()).toHaveTextContent('uber://learn?target=home&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4');
    await pick(user, 'Learning paths', 'New driver');
    await pick(user, 'Course groups', 'EV');
    expect(preview()).toHaveTextContent(
      'uber://learn?target=home&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4&path_id=new-driver-essentials&groups=ev-drivers',
    );
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Search courses')).toBeInTheDocument();
    expect(preview()).toHaveTextContent('uber://learn?target=home&path_id=new-driver-essentials&groups=ev-drivers');
  });

  it('creates a link from the steps, as JSON', async () => {
    const {
      axiosMock,
      onClose,
      mockShowToast,
      user,
    } = setup();
    axiosMock.onPost(apiUrls.deepLinks()).reply(201, rawDeepLinks[0]);
    await user.type(screen.getByLabelText('Name'), 'Lisbon onboarding');
    await user.type(screen.getByLabelText('Description (optional)'), 'For the Lisbon launch.');
    await user.click(screen.getByRole('radio', { name: 'Optional courses' }));
    await pickCourse(user);
    await pick(user, 'Learning paths', 'New driver');
    await pick(user, 'Course groups', 'EV');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      title: 'Lisbon onboarding',
      description: 'For the Lisbon launch.',
      target: 'optional',
      course_id: 'course-v1:Uber+DRV101+2026_Q4',
      path_ids: ['new-driver-essentials'],
      groups: ['ev-drivers'],
    });
    expect(mockShowToast).toHaveBeenCalledWith('Deep link created');
  }, 15000); // Types through every step; slow when the whole suite runs at once.

  it('refuses a missing name, a course link without a course and a path link without a path, sending nothing', async () => {
    const { axiosMock, user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Course' }));
    expect(screen.queryByTestId('app-link-preview')).not.toBeInTheDocument();
    expect(screen.getByText('Choose a course to build its link.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText('Choose a course for a course link.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Learning path' }));
    expect(screen.getByText('Pick at least one learning path to build its link.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Pick at least one learning path for a learning path link.')).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('does not submit the form when Enter finds no match in a multi-select', async () => {
    const { axiosMock, user } = setup();
    await user.type(screen.getByLabelText('Name'), 'Lisbon');
    await user.type(screen.getByLabelText('Course groups'), 'nothing like this');
    await user.keyboard('{Enter}');
    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('lets a path link carry several paths and choose which one opens', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Learning path' }));
    await pick(user, 'Learning paths', 'New driver');
    expect(preview()).toHaveTextContent('uber://learn?target=path&path_id=new-driver-essentials');
    expect(screen.queryByLabelText('Opens')).not.toBeInTheDocument();
    await pick(user, 'Learning paths', 'Road');
    // The first picked path opens until another is chosen; the opened one is listed first.
    expect(preview()).toHaveTextContent('uber://learn?target=path&path_id=new-driver-essentials%2Croad-safety');
    await user.selectOptions(screen.getByLabelText('Opens'), 'road-safety');
    expect(preview()).toHaveTextContent('uber://learn?target=path&path_id=road-safety%2Cnew-driver-essentials');
    // Removing the opened path falls back to the next one.
    await user.click(screen.getByRole('button', { name: 'Remove Road safety (road-safety)' }));
    expect(preview()).toHaveTextContent('uber://learn?target=path&path_id=new-driver-essentials');
  });

  it('edits: starts from the saved link, PUTs, and maps a 400 onto its fields', async () => {
    const { axiosMock, onClose, user } = setup({ link });
    axiosMock.onPut(apiUrls.deepLink('link-1')).reply(400, {
      title: ['Too long.'],
      path_ids: ['Learning path not found: gone.'],
      non_field_errors: ['Nope.'],
    });
    expect(screen.getByRole('heading', { name: 'Edit deep link' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Lisbon onboarding');
    expect(screen.getByRole('radio', { name: 'Home page' })).toBeChecked();
    expect(screen.getByText('Getting started')).toBeInTheDocument();
    // A path or group the link holds is kept even when it no longer exists in Studio.
    expect(preview()).toHaveTextContent(
      'uber://learn?target=home&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4&path_id=new-driver-essentials%2Cgone&groups=ev-drivers%2Cporto',
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect(JSON.parse(axiosMock.history.put[0].data)).toEqual({
      title: 'Lisbon onboarding',
      description: 'Handed to Uber for the Lisbon launch.',
      target: 'home',
      course_id: 'course-v1:Uber+DRV101+2026_Q4',
      path_ids: ['new-driver-essentials', 'gone'],
      groups: ['ev-drivers', 'porto'],
    });
    expect(await screen.findByText('Too long.')).toBeInTheDocument();
    expect(screen.getByText('Learning path not found: gone.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Nope.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the opened path first when editing a path link', async () => {
    const { axiosMock, onClose, user } = setup({
      link: {
        ...link,
        target: 'path',
        paths: [{ slug: 'road-safety', title: 'Road safety', exists: true }, link.paths[0]],
      },
    });
    axiosMock.onPut(apiUrls.deepLink('link-1')).reply(200, rawDeepLinks[0]);
    expect(screen.getByLabelText('Opens')).toHaveValue('road-safety');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(axiosMock.history.put[0].data).path_ids).toEqual(['road-safety', 'new-driver-essentials']);
  });

  it('says when there are no learning paths or course groups to pick', () => {
    setup({ paths: [], groups: [] });
    expect(screen.getByText('No learning paths yet. Create one on the Curriculum tab.')).toBeInTheDocument();
    expect(screen.getByText('No course groups yet.')).toBeInTheDocument();
  });

  it('shows the generic error when the save fails for another reason', async () => {
    const { axiosMock, user } = setup({ link });
    axiosMock.onPut(apiUrls.deepLink('link-1')).reply(500);
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
