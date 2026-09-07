import type {
  Course, Instructor, Learner, PaginatedCourses, PaginatedLearners, Program,
} from './types';

export const mockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-v1:TestOrg+CS101+2025',
  displayName: 'Introduction to CS',
  org: 'TestOrg',
  run: '2025',
  ...overrides,
});

export const mockInstructor = (overrides: Partial<Instructor> = {}): Instructor => ({
  id: 'prof.john',
  username: 'prof.john',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'staff',
  ...overrides,
});

export const mockLearner = (overrides: Partial<Learner> = {}): Learner => ({
  id: 'student.alice',
  username: 'student.alice',
  email: 'alice@example.com',
  name: 'Alice Smith',
  ...overrides,
});

export const mockProgram = (overrides: Partial<Program> = {}): Program => ({
  id: 'prog-key-1',
  displayName: 'Test Program',
  org: 'TestOrg',
  programType: 'certificate',
  run: '2025',
  courses: [],
  ...overrides,
});

export const mockPaginatedCourses = (
  results: Course[] = [mockCourse()],
  overrides: Partial<PaginatedCourses> = {},
): PaginatedCourses => ({
  results,
  count: results.length,
  numPages: 1,
  ...overrides,
});

export const mockPaginatedLearners = (
  results: Learner[] = [mockLearner()],
  overrides: Partial<PaginatedLearners> = {},
): PaginatedLearners => ({
  results,
  count: results.length,
  numPages: 1,
  ...overrides,
});
