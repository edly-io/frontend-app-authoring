import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import { rawCurriculums } from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type { Curriculum } from '../types';
import CurriculumCard from './CurriculumCard';

const curriculum = camelCaseObject(rawCurriculums[0]) as Curriculum;

describe('<CurriculumCard />', () => {
  it('shows title, ID and chips; expands to courses, knowledge check and slots', async () => {
    initializeMocks();
    const user = userEvent.setup();
    render(<CurriculumCard curriculum={curriculum} defaultExpanded={false} onEdit={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'New driver essentials' })).toBeInTheDocument();
    expect(screen.getByText('ID: cur-1')).toBeInTheDocument();
    expect(screen.getByText('2 courses')).toBeInTheDocument();
    expect(screen.getByText('Knowledge check after 30 days')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 badges')).toBeInTheDocument();
    expect(screen.queryByText('Courses, in learner order')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /^new driver essentials/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Getting started')).toBeInTheDocument();
    expect(screen.getByText('Opens 30 days after Complete')).toBeInTheDocument();
    expect(screen.getByText('Complete: Road ready')).toBeInTheDocument();
  });

  it('shows each slot read-only, with the badge image, and "No badge" for an empty slot', () => {
    initializeMocks();
    const withEmptySlot = { ...curriculum, badges: { ...curriculum.badges, retained: null } };
    render(<CurriculumCard curriculum={withEmptySlot} defaultExpanded onEdit={jest.fn()} />);
    expect(screen.getByText('1 of 2 badges')).toBeInTheDocument();
    expect(screen.getByText('Complete: Road ready')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Road ready' })).toHaveAttribute(
      'src',
      curriculum.badges.complete?.imageUrl,
    );
    expect(screen.getByText('Retained: No badge')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1); // no image for the image-less or empty slots
    expect(screen.queryByRole('link')).not.toBeInTheDocument(); // slots never link to the Badges page
  });

  it('falls back to the course key and flags a course that no longer exists', () => {
    initializeMocks();
    render(<CurriculumCard curriculum={curriculum} defaultExpanded onEdit={jest.fn()} />);
    const missing = screen.getAllByText('course-v1:Uber+DRV102+2026_Q4');
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Course not found')).toBeInTheDocument();
  });

  it('calls onEdit', async () => {
    initializeMocks();
    const onEdit = jest.fn();
    render(<CurriculumCard curriculum={curriculum} defaultExpanded={false} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit New driver essentials' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('deletes after confirming and shows a toast', async () => {
    const { axiosMock, mockShowToast } = initializeMocks();
    axiosMock.onDelete(apiUrls.curriculum('cur-1')).reply(204);
    const user = userEvent.setup();
    render(<CurriculumCard curriculum={curriculum} defaultExpanded={false} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete New driver essentials' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(axiosMock.history.delete[0].url).toEqual(apiUrls.curriculum('cur-1'));
    expect(mockShowToast).toHaveBeenCalledWith('Curriculum deleted');
  });

  it('shows an alert when delete fails', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onDelete(apiUrls.curriculum('cur-1')).reply(500);
    const user = userEvent.setup();
    render(<CurriculumCard curriculum={curriculum} defaultExpanded={false} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete New driver essentials' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Couldn\'t delete')).toBeInTheDocument();
  });

  it('explains a 409 when the curriculum is assigned to learners', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onDelete(apiUrls.curriculum('cur-1')).reply(409, {
      detail: 'This curriculum is assigned to learners and can\'t be deleted.',
      assignment_count: 3,
    });
    const user = userEvent.setup();
    render(<CurriculumCard curriculum={curriculum} defaultExpanded={false} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete New driver essentials' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('This curriculum is assigned to 3 learners, so it can\'t be deleted.'))
      .toBeInTheDocument();
  });
});
