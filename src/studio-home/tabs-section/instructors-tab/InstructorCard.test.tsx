import { initializeMocks, render, screen } from '@src/testUtils';
import type { InstructorProfile } from '../../../instructors/data/types';
import InstructorCard from './InstructorCard';

const makeInstructor = (courseCount: number): InstructorProfile => ({
  id: 1,
  name: 'Test Instructor',
  courses: Array.from({ length: courseCount }, (_, index) => ({
    course_id: `course-v1:Org+C${index}+Run`,
  })),
} as unknown as InstructorProfile);

describe('<InstructorCard />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it.each([
    [0, '0 courses'],
    [1, '1 course'],
    [2, '2 courses'],
    [11, '11 courses'],
  ])('shows the course count for %i courses', (count, text) => {
    render(<InstructorCard instructor={makeInstructor(count)} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows 0 courses when the instructor has no course list', () => {
    render(<InstructorCard instructor={{ id: 2, name: 'No Courses' } as InstructorProfile} />);
    expect(screen.getByText('0 courses')).toBeInTheDocument();
  });
});
