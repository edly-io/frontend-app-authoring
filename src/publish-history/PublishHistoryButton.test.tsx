import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import * as api from './data/api';
import PublishHistoryButton from './PublishHistoryButton';
import { COURSE_ID, httpError } from './testHelpers';

jest.mock('./data/api');
jest.mock('@src/CourseAuthoringContext', () => ({
  useCourseAuthoringContext: () => ({ courseId: 'course-v1:Uber+101+2026' }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const getStatus = api.getStatus as jest.Mock;
const buttonName = 'Publish History';

describe('<PublishHistoryButton />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('shows the button when the flag is on and the user can view', async () => {
    getStatus.mockResolvedValue({ enabled: true, canView: true });
    render(<PublishHistoryButton />);
    expect(await screen.findByRole('button', { name: buttonName })).toBeInTheDocument();
  });

  it('asks for the status of this course', async () => {
    getStatus.mockResolvedValue({ enabled: true, canView: true });
    render(<PublishHistoryButton />);
    await screen.findByRole('button', { name: buttonName });
    expect(getStatus).toHaveBeenCalledWith(COURSE_ID);
  });

  it('is hidden when the flag is off', async () => {
    getStatus.mockResolvedValue({ enabled: false, canView: true });
    render(<PublishHistoryButton />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: buttonName })).not.toBeInTheDocument();
  });

  it('is hidden when the user cannot view', async () => {
    getStatus.mockResolvedValue({ enabled: true, canView: false });
    render(<PublishHistoryButton />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: buttonName })).not.toBeInTheDocument();
  });

  it.each([401, 403, 404])('is hidden when the status request fails with %s', async (code) => {
    getStatus.mockRejectedValue(httpError(code));
    render(<PublishHistoryButton />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: buttonName })).not.toBeInTheDocument();
  });

  it('is hidden while the status is loading', () => {
    getStatus.mockReturnValue(new Promise(() => {}));
    render(<PublishHistoryButton />);
    expect(screen.queryByRole('button', { name: buttonName })).not.toBeInTheDocument();
  });

  it('navigates to the publish history page of the course on click', async () => {
    getStatus.mockResolvedValue({ enabled: true, canView: true });
    render(<PublishHistoryButton />);
    await userEvent.click(await screen.findByRole('button', { name: buttonName }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(`/course/${COURSE_ID}/publish_history`);
  });

  it('does not open a new window', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    getStatus.mockResolvedValue({ enabled: true, canView: true });
    render(<PublishHistoryButton />);
    await userEvent.click(await screen.findByRole('button', { name: buttonName }));
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
