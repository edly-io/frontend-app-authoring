import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import {
  fireEvent,
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';
import {
  page,
  rawBadges,
  rawCourseBadge,
  rawCourses,
} from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type { Badge } from '../types';
import BadgeForm from './BadgeForm';

jest.mock('@src/generic/prompt-if-dirty/PromptIfDirty', () => ({ __esModule: true, default: () => null }));

const linkedBadge = camelCaseObject(rawBadges[0]) as Badge;
const courseBadge = camelCaseObject(rawCourseBadge) as Badge;

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const drop = (file: File) =>
  fireEvent.drop(screen.getByTestId('badge-image-dropzone'), {
    dataTransfer: {
      files: [file],
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
      types: ['Files'],
    },
  });

describe('<BadgeForm />', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:preview');
    global.URL.revokeObjectURL = jest.fn();
  });

  const setup = (badge?: Badge) => {
    const mocks = initializeMocks();
    const onClose = jest.fn();
    const onCancel = jest.fn();
    render(<BadgeForm badge={badge} onClose={onClose} onCancel={onCancel} onDirtyChange={jest.fn()} />);
    return {
      ...mocks,
      onClose,
      onCancel,
      user: userEvent.setup(),
    };
  };

  it('creates a badge with an image (multipart) and shows a preview', async () => {
    const {
      axiosMock,
      onClose,
      mockShowToast,
      user,
    } = setup();
    axiosMock.onPost(apiUrls.badges()).reply(201, rawBadges[3]);
    expect(screen.getByRole('heading', { name: 'New badge' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Curriculum badge' })).toBeChecked();
    await user.type(screen.getByLabelText('Title'), 'Holiday rush ready');
    expect(screen.getByText('18 / 100')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Description'), 'Seasonal.');
    const png = new File(['png'], 'badge.png', { type: 'image/png' });
    await user.upload(fileInput(), png);
    expect(await screen.findByRole('img', { name: 'Holiday rush ready' })).toHaveAttribute('src', 'blob:preview');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('title')).toEqual('Holiday rush ready');
    expect(body.get('description')).toEqual('Seasonal.');
    expect(body.get('image')).toBe(png);
    expect(body.get('kind')).toEqual('curriculum');
    expect(body.has('course_ids')).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Badge created');
  });

  it('opens in its own modal; Cancel asks to cancel', async () => {
    const { onCancel, onClose, user } = setup(linkedBadge);
    expect(screen.getByRole('dialog', { name: 'Edit badge' })).toContainElement(screen.getByTestId('badge-form'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rejects an SVG with the type error', async () => {
    setup();
    drop(new File(['<svg/>'], 'evil.svg', { type: 'image/svg+xml' }));
    expect(await screen.findByText('Upload a PNG or JPG image.')).toBeInTheDocument();
  });

  /** A PNG of exactly `bytes` bytes, without allocating a real buffer. */
  const pngOfSize = (bytes: number) => {
    const file = new File(['png'], 'badge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: bytes });
    return file;
  };

  const fillAndCreate = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Title'), 'Holiday rush ready');
    await user.type(screen.getByLabelText('Description'), 'Seasonal.');
    await user.click(screen.getByRole('button', { name: 'Create' }));
  };

  it('rejects an image over 1 MB (1,048,577 bytes) and sends no image', async () => {
    const { axiosMock, onClose, user } = setup();
    axiosMock.onPost(apiUrls.badges()).reply(201, rawBadges[3]);
    drop(pngOfSize(1048577));
    expect(await screen.findByText('The image must be 1 MB or smaller.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Holiday rush ready' })).not.toBeInTheDocument();
    await fillAndCreate(user);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((axiosMock.history.post[0].data as FormData).has('image')).toBe(false);
  });

  it('accepts an image of exactly 1 MB (1,048,576 bytes)', async () => {
    const { axiosMock, onClose, user } = setup();
    axiosMock.onPost(apiUrls.badges()).reply(201, rawBadges[3]);
    const png = pngOfSize(1048576);
    drop(png);
    await fillAndCreate(user);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByText('The image must be 1 MB or smaller.')).not.toBeInTheDocument();
    expect((axiosMock.history.post[0].data as FormData).get('image')).toBe(png);
  });

  it('requires title and description', async () => {
    const { axiosMock, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText('Enter a description.')).toBeInTheDocument();
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it('edits: shows the UUID, removes the image with remove_image=true', async () => {
    const { axiosMock, onClose, user } = setup(linkedBadge);
    axiosMock.onPatch(apiUrls.badge(linkedBadge.uuid)).reply(200, rawBadges[0]);
    expect(screen.getByRole('heading', { name: 'Edit badge' })).toBeInTheDocument();
    expect(screen.getByText(linkedBadge.uuid)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Road ready' })).toHaveAttribute('src', linkedBadge.imageUrl);
    await user.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(screen.queryByRole('img', { name: 'Road ready' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = axiosMock.history.patch[0].data as FormData;
    expect(body.get('remove_image')).toEqual('true');
    expect(body.has('image')).toBe(false);
    expect(body.has('kind')).toBe(false);
    expect(body.has('course_ids')).toBe(false);
  });

  it('creates a course badge with the courses picked', async () => {
    const { axiosMock, onClose, user } = setup();
    axiosMock.onGet(apiUrls.courses('DRV')).reply(200, page(rawCourses));
    axiosMock.onPost(apiUrls.badges()).reply(201, rawCourseBadge);
    expect(screen.queryByLabelText('Add a course')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Course badge' }));
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Airport pro');
    await user.type(screen.getByLabelText('Description'), 'Airport courses.');
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    expect(screen.getByRole('button', { name: 'Remove Getting started' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = axiosMock.history.post[0].data as FormData;
    expect(body.get('kind')).toEqual('course');
    expect(body.getAll('course_ids')).toEqual(['course-v1:Uber+DRV101+2026_Q4']);
  });

  it('picking a second course replaces the first: a course badge has one course', async () => {
    const { axiosMock, user } = setup();
    axiosMock.onGet(apiUrls.courses('DRV')).reply(200, page(rawCourses));
    await user.click(screen.getByRole('radio', { name: 'Course badge' }));
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Getting started' }));
    await user.type(screen.getByLabelText('Add a course'), 'DRV');
    await user.click(await screen.findByRole('button', { name: 'Add Earnings and payouts' }));
    expect(screen.getByRole('button', { name: 'Remove Earnings and payouts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Getting started' })).not.toBeInTheDocument();
  });

  it('edits a course badge: kind is read-only; removing every course sends one empty course_ids', async () => {
    const { axiosMock, onClose, user } = setup(courseBadge);
    axiosMock.onPatch(apiUrls.badge(courseBadge.uuid)).reply(200, rawCourseBadge);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('Course badge')).toBeInTheDocument();
    expect(screen.getByText('Course not found')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Airport pickups' }));
    await user.click(screen.getByRole('button', { name: 'Remove course-v1:Uber+DRV202+2026_Q4' }));
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
    expect(screen.getByLabelText('Add a course')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const body = axiosMock.history.patch[0].data as FormData;
    expect(body.has('kind')).toBe(false);
    expect(body.getAll('course_ids')).toEqual(['']);
  });

  it('maps a server course_ids error onto the course row by index', async () => {
    const { axiosMock, user } = setup(courseBadge);
    axiosMock.onPatch(apiUrls.badge(courseBadge.uuid)).reply(400, {
      course_ids: { 0: ['This course already awards "Holiday rush ready".'] },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('This course already awards "Holiday rush ready".')).toBeInTheDocument();
  });

  it('maps a server image error onto the image field', async () => {
    const { axiosMock, user } = setup(linkedBadge);
    axiosMock.onPatch(apiUrls.badge(linkedBadge.uuid)).reply(400, { image: ['Upload a valid image.'] });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Upload a valid image.')).toBeInTheDocument();
  });
});
