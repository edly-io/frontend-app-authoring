import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import { rawCourseGroups } from '../__mocks__/fixtures';
import { apiUrls } from '../data/api';
import type { CourseGroup } from '../types';
import CourseGroupCard from './CourseGroupCard';

const group = camelCaseObject(rawCourseGroups[0]) as CourseGroup;
const emptyGroup = camelCaseObject(rawCourseGroups[1]) as CourseGroup;

describe('<CourseGroupCard />', () => {
  it('shows title, Group ID and chips; expands to the description and courses', async () => {
    initializeMocks();
    const user = userEvent.setup();
    render(<CourseGroupCard group={group} onEdit={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'EV drivers' })).toBeInTheDocument();
    expect(screen.getByText('Group ID: ev-drivers')).toBeInTheDocument();
    expect(screen.getByText('2 courses')).toBeInTheDocument();
    expect(screen.getByText('12 drivers')).toBeInTheDocument();
    expect(screen.queryByText('Optional courses')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^ev drivers/i }));
    expect(screen.getByText('Drivers with an electric vehicle.')).toBeInTheDocument();
    expect(screen.getByText('Optional courses')).toBeInTheDocument();
    expect(screen.getByText('Getting started')).toBeInTheDocument();
    expect(screen.getByText('Course not found')).toBeInTheDocument();
  });

  it('says when a group has no drivers and no courses', () => {
    initializeMocks();
    render(<CourseGroupCard group={emptyGroup} defaultExpanded onEdit={jest.fn()} />);
    expect(screen.getByText('No drivers yet')).toBeInTheDocument();
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
  });

  it('deletes after confirming, warning about the drivers in the group', async () => {
    const { axiosMock, mockShowToast } = initializeMocks();
    axiosMock.onDelete(apiUrls.courseGroup('ev-drivers')).reply(204);
    const user = userEvent.setup();
    render(<CourseGroupCard group={group} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete EV drivers' }));
    expect(await screen.findByText(/12 drivers are in this group/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(axiosMock.history.delete[0].url).toEqual(apiUrls.courseGroup('ev-drivers'));
    expect(mockShowToast).toHaveBeenCalledWith('Course group deleted');
  });

  it('shows an alert when delete fails', async () => {
    const { axiosMock } = initializeMocks();
    axiosMock.onDelete(apiUrls.courseGroup('nyc-new-drivers')).reply(500);
    const user = userEvent.setup();
    render(<CourseGroupCard group={emptyGroup} onEdit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete New drivers in NYC' }));
    expect(screen.queryByText(/are in this group/)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});
