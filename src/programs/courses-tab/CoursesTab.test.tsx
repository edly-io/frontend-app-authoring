import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import CoursesTab from './CoursesTab';
import { mockCourse, mockProgram } from '../data/api.mock';

const mockRemoveMutate = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useRemoveCourseFromProgram: () => ({ mutateAsync: mockRemoveMutate, isPending: false }),
  // AddCourseModal is rendered as a child; supply stubs so it doesn't throw
  useCourses: () => ({ data: { results: [], count: 0, numPages: 1 }, isLoading: false, isFetching: false }),
  useAddCourseToProgram: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const programId = 'prog-key-1';

describe('<CoursesTab />', () => {
  beforeEach(() => {
    initializeMocks();
    mockRemoveMutate.mockResolvedValue(undefined);
  });

  it('renders empty state when program has no courses', () => {
    const program = mockProgram({ courses: [] });
    render(<CoursesTab program={program} programId={programId} />);
    expect(screen.getByText(/No courses added yet/i)).toBeInTheDocument();
  });

  it('renders course list with name, org and run', () => {
    const course = mockCourse({ displayName: 'My Course', org: 'MyOrg', run: '2025' });
    const program = mockProgram({ courses: [course] });
    render(<CoursesTab program={program} programId={programId} />);
    expect(screen.getByText('My Course')).toBeInTheDocument();
    expect(screen.getByText('MyOrg')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('hides course management actions in read-only mode', () => {
    const program = mockProgram({ courses: [mockCourse()] });
    render(<CoursesTab program={program} programId={programId} canManage={false} />);

    expect(screen.queryByRole('button', { name: /Add Course/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
  });

  it('opens AddCourseModal when "Add Course" is clicked', () => {
    const program = mockProgram({ courses: [] });
    render(<CoursesTab program={program} programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Course/i }));
    expect(screen.getByText('Add Course to Program')).toBeInTheDocument();
  });

  it('opens confirmation dialog when Remove is clicked', () => {
    const course = mockCourse({ displayName: 'Removable Course' });
    const program = mockProgram({ courses: [course] });
    render(<CoursesTab program={program} programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    expect(screen.getByText('Remove Course from Program?')).toBeInTheDocument();
  });

  it('shows course name and unenrollment warning in confirmation dialog', () => {
    const course = mockCourse({ displayName: 'Removable Course' });
    const program = mockProgram({ courses: [course] });
    render(<CoursesTab program={program} programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /^Remove$/ }));
    // Course name appears in both the row and the dialog description
    expect(screen.getAllByText('Removable Course').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/unenroll all program learners/i)).toBeInTheDocument();
  });

  it('calls removeMutate with correct args when confirm is clicked', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025' });
    const program = mockProgram({ courses: [course] });
    render(<CoursesTab program={program} programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Remove Course/i }));
    await waitFor(() => expect(mockRemoveMutate).toHaveBeenCalledWith({
      programId,
      courseId: 'course-v1:Org+X+2025',
    }));
  });

  it('closes dialog when Cancel is clicked', async () => {
    const course = mockCourse();
    const program = mockProgram({ courses: [course] });
    render(<CoursesTab program={program} programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    expect(screen.getByText('Remove Course from Program?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByText('Remove Course from Program?')).not.toBeInTheDocument());
  });

  it('disables all Remove buttons while confirmation is open', () => {
    const courses = [
      mockCourse({ id: 'c1', displayName: 'Course A' }),
      mockCourse({ id: 'c2', displayName: 'Course B' }),
    ];
    const program = mockProgram({ courses });
    render(<CoursesTab program={program} programId={programId} />);
    const removeButtons = screen.getAllByRole('button', { name: /^Remove$/ });
    fireEvent.click(removeButtons[0]);
    // After confirmation opens, Paragon hides background via aria-hidden so
    // we query with hidden:true to still find the now-disabled row buttons.
    screen.getAllByRole('button', { name: /^Remove$/, hidden: true }).forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
