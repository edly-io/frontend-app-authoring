import type { Course, Program } from './types';

// Mutable — createProgram() and updateProgram() modify this in-place so
// React Query cache invalidation returns updated data without a real API.
export const AVAILABLE_AUDIENCES: string[] = ['Auditors', 'Inspectors', 'Clerks'];

export const MOCK_COURSES: Course[] = [
  {
    id: 'course-001',
    displayName: 'Tax Assessment Fundamentals',
    org: 'IRSA Lahore',
    run: '2024-Spring',
    targetAudience: 'Inspectors',
  },
  {
    id: 'course-002',
    displayName: 'Advanced Audit Techniques',
    org: 'IRSA Lahore',
    run: '2024-Summer',
    targetAudience: 'Auditors',
  },
  {
    id: 'course-003',
    displayName: 'Digital Tools for Revenue Administration',
    org: 'IRSA Karachi',
    run: '2024-Spring',
    targetAudience: 'Clerks',
  },
  {
    id: 'course-004',
    displayName: 'Compliance and Legal Frameworks',
    org: 'IRSA Lahore',
    run: '2024-Fall',
    targetAudience: 'Inspectors',
  },
  {
    id: 'course-005',
    displayName: 'Data Analysis for Tax Professionals',
    org: 'IRSA Islamabad',
    run: '2024-Summer',
    targetAudience: 'Auditors',
  },
  {
    id: 'course-006',
    displayName: 'Customer Service in Public Administration',
    org: 'IRSA Karachi',
    run: '2024-Fall',
    targetAudience: 'Clerks',
  },
];

export const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog-001',
    displayName: 'Advanced Tax Assessment Program',
    org: 'IRSA Lahore',
    programType: 'STP',
    run: '2024-Q1',
    targetAudience: 'Inspectors',
    status: 'active',
    isFeatured: true,
    shortDescription: 'A comprehensive program for tax assessment professionals.',
    longDescription: 'This program provides in-depth training on advanced tax assessment methodologies, equipping inspectors with the skills needed to handle complex cases effectively and in compliance with current regulations.',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    courses: MOCK_COURSES.filter((c) => ['course-001', 'course-004'].includes(c.id)),
  },
  {
    id: 'prog-002',
    displayName: 'Digital Skills Training',
    org: 'IRSA Lahore',
    programType: 'DST',
    run: '2024-Q2',
    targetAudience: 'Clerks',
    status: 'draft',
    isFeatured: false,
    shortDescription: 'Build essential digital skills for modern revenue administration.',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    courses: MOCK_COURSES.filter((c) => c.id === 'course-003'),
  },
  {
    id: 'prog-003',
    displayName: 'Internal Services Training',
    org: 'IRSA Lahore',
    programType: 'IST',
    run: '2024-Q3',
    targetAudience: 'Auditors',
    status: 'active',
    isFeatured: false,
    shortDescription: 'Enhance internal service delivery skills for auditing professionals.',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    courses: [],
  },
];
