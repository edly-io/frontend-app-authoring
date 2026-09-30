import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import InstructorsTab from './InstructorsTab';
import {
  mockCourse, mockCourseTeam, mockInstructor, mockProgram,
} from '../data/api.mock';

const mockRemoveMutate = jest.fn();
const mockUseCourseTeam = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useCourseTeam: (...args: any[]) => mockUseCourseTeam(...args),
  useRemoveInstructorFromCourse: () => ({ mutateAsync: mockRemoveMutate, isPending: false }),
  // AddInstructorModal is rendered as a child; supply stubs so it doesn't throw
  useInstructors: () => ({ data: { results: [], count: 0, numPages: 1 }, isLoading: false, isFetching: false }),
  useAddInstructorToCourse: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe('<InstructorsTab />', () => {
  beforeEach(() => {
    initializeMocks();
    mockRemoveMutate.mockResolvedValue(undefined);
    mockUseCourseTeam.mockReturnValue({ data: mockCourseTeam(), isLoading: false });
  });

  it('shows "no courses" alert when program has no courses', () => {
    const program = mockProgram({ courses: [] });
    render(<InstructorsTab program={program} />);
    expect(screen.getByText(/No courses added to this program/i)).toBeInTheDocument();
  });

  it('shows course dropdown when program has courses', () => {
    const course = mockCourse({ displayName: 'CS 101' });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    expect(screen.getByRole('option', { name: 'CS 101' })).toBeInTheDocument();
  });

  it('"Add Instructor" is disabled when no course selected', () => {
    const program = mockProgram({ courses: [mockCourse()] });
    render(<InstructorsTab program={program} />);
    expect(screen.getByRole('button', { name: /Add Instructor/i })).toBeDisabled();
  });

  it('shows instructor list after selecting a course', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ name: 'Prof. Smith', email: 'smith@example.com' });
    mockUseCourseTeam.mockReturnValue({ data: mockCourseTeam({ members: [instructor] }), isLoading: false });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    expect(await screen.findByText('Prof. Smith')).toBeInTheDocument();
    expect(screen.getByText('smith@example.com')).toBeInTheDocument();
  });

  it('hides instructor management actions in read-only mode', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025' });
    mockUseCourseTeam.mockReturnValue({ data: mockCourseTeam({ members: [mockInstructor()] }), isLoading: false });
    const program = mockProgram({ courses: [course] });

    render(<InstructorsTab program={program} canManage={false} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: course.id } });

    expect(screen.queryByRole('button', { name: /Add Instructor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
  });

  it('shows role badge for instructor', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ role: 'staff' });
    mockUseCourseTeam.mockReturnValue({ data: mockCourseTeam({ members: [instructor] }), isLoading: false });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    expect(await screen.findByText(/staff/i)).toBeInTheDocument();
  });

  it('opens confirmation dialog when Remove is clicked', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ email: 'smith@example.com' });
    mockUseCourseTeam.mockReturnValue({ data: mockCourseTeam({ members: [instructor] }), isLoading: false });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    fireEvent.click(await screen.findByRole('button', { name: /^Remove$/ }));
    expect(screen.getByText('Remove Instructor?')).toBeInTheDocument();
    // Email appears in both the row badge and the dialog description
    expect(screen.getAllByText('smith@example.com').length).toBeGreaterThanOrEqual(2);
  });

  it('calls removeInstructor with courseId and username when confirm is clicked', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ username: 'prof.smith', email: 'smith@example.com' });
    mockUseCourseTeam.mockReturnValue({ data: mockCourseTeam({ members: [instructor] }), isLoading: false });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    fireEvent.click(await screen.findByRole('button', { name: /^Remove$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Instructor/i }));
    await waitFor(() => expect(mockRemoveMutate).toHaveBeenCalledWith({
      courseId: 'course-v1:Org+X+2025',
      username: 'prof.smith',
    }));
  });

  it('disables Remove and shows a tooltip when the instructor has scheduled sessions', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ hasScheduledSessions: true });
    mockUseCourseTeam.mockReturnValue({
      data: mockCourseTeam({ members: [instructor] }),
      isLoading: false,
    });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });

    const btn = await screen.findByRole('button', { name: /^Remove$/ });
    expect(btn).toBeDisabled();
    fireEvent.mouseOver(btn.parentElement!);
    expect(await screen.findByText(/scheduled sessions for this course/i)).toBeInTheDocument();
  });

  it('disables Remove and shows a tooltip when the program has started', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ hasScheduledSessions: false });
    mockUseCourseTeam.mockReturnValue({
      data: mockCourseTeam({ programStarted: true, members: [instructor] }),
      isLoading: false,
    });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });

    const btn = await screen.findByRole('button', { name: /^Remove$/ });
    expect(btn).toBeDisabled();
    fireEvent.mouseOver(btn.parentElement!);
    expect(await screen.findByText(/program has started/i)).toBeInTheDocument();
  });

  it('keeps Remove enabled when there are no scheduled sessions and the program has not started', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ hasScheduledSessions: false });
    mockUseCourseTeam.mockReturnValue({
      data: mockCourseTeam({ programStarted: false, members: [instructor] }),
      isLoading: false,
    });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });

    const btn = await screen.findByRole('button', { name: /^Remove$/ });
    expect(btn).not.toBeDisabled();
  });
});
