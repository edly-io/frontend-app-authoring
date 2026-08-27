import type { Course, Program } from './types';

export const MOCK_COURSES: Course[] = [
  {
    id: 'course-001',
    displayName: 'Introduction to Machine Learning',
    org: 'Rwaq',
    run: '2024-Spring',
  },
  {
    id: 'course-002',
    displayName: 'Web Development Fundamentals',
    org: 'Rwaq',
    run: '2024-Summer',
  },
  {
    id: 'course-003',
    displayName: 'Data Science with Python',
    org: 'Rwaq',
    run: '2024-Spring',
  },
  {
    id: 'course-004',
    displayName: 'Cloud Computing Essentials',
    org: 'Rwaq',
    run: '2024-Fall',
  },
];

export const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog-001',
    displayName: 'Data Science Program',
    org: 'Rwaq',
    programType: 'MASTERS',
    run: '2024-Q1',
    status: 'active',
    isFeatured: true,
    shortDescription: 'A comprehensive program for aspiring data scientists.',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    courses: MOCK_COURSES.filter((c) => ['course-001', 'course-003'].includes(c.id)),
    isPaid: true,
    pricingMode: 'custom',
    customPrice: '499.00',
  },
  {
    id: 'prog-002',
    displayName: 'Web Development Track',
    org: 'Rwaq',
    programType: 'MICROBACHELORS',
    run: '2024-Q2',
    status: 'draft',
    isFeatured: false,
    shortDescription: 'Build modern web applications from scratch.',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    courses: MOCK_COURSES.filter((c) => c.id === 'course-002'),
    isPaid: false,
    pricingMode: 'collective',
    customPrice: null,
  },
];
