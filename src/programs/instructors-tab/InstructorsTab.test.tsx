import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import InstructorsTab from './InstructorsTab';
import { mockCourse, mockInstructor, mockProgram } from '../data/api.mock';

const mockUseCourseTeam = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useCourseTeam: (...args: any[]) => mockUseCourseTeam(...args),
}));

describe('<InstructorsTab />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseCourseTeam.mockReturnValue({ data: [], isLoading: false });
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

  it('does not show "Manage in Studio" button when no course selected', () => {
    const program = mockProgram({ courses: [mockCourse()] });
    render(<InstructorsTab program={program} />);
    expect(screen.queryByRole('link', { name: /Manage in Studio/i })).not.toBeInTheDocument();
  });

  it('shows instructor list after selecting a course', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ name: 'Prof. Smith', email: 'smith@example.com' });
    mockUseCourseTeam.mockReturnValue({ data: [instructor], isLoading: false });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    expect(await screen.findByText('Prof. Smith')).toBeInTheDocument();
    expect(screen.getByText('smith@example.com')).toBeInTheDocument();
  });

  it('shows role badge for instructor', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const instructor = mockInstructor({ role: 'staff' });
    mockUseCourseTeam.mockReturnValue({ data: [instructor], isLoading: false });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    expect(await screen.findByText('staff')).toBeInTheDocument();
  });

  it('shows "Manage in Studio" button after selecting a course', async () => {
    const course = mockCourse({ id: 'course-v1:Org+X+2025', displayName: 'CS 101' });
    const program = mockProgram({ courses: [course] });
    render(<InstructorsTab program={program} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'course-v1:Org+X+2025' } });
    const link = await screen.findByRole('link', { name: /Manage in Studio/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('target', '_blank');
  });
});
