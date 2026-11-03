import { computeDefaultSlug } from './slug';

describe('computeDefaultSlug', () => {
  it('builds the slug from the course key, matching rwaq_features slugs.py', () => {
    expect(computeDefaultSlug('Rwaq', '1357', '2026')).toBe('course-v1-rwaq-1357-2026');
  });

  it('lower-cases org, number and run', () => {
    expect(computeDefaultSlug('ORG', 'AAA', 'Run_1')).toBe('course-v1-org-aaa-run_1');
  });

  it('replaces colon, plus and space with a dash', () => {
    expect(computeDefaultSlug('My Org', 'CS 101', '2026 T1')).toBe('course-v1-my-org-cs-101-2026-t1');
  });

  it('keeps dots, underscores and dashes', () => {
    expect(computeDefaultSlug('org', 'a.b_c-d', '2026')).toBe('course-v1-org-a.b_c-d-2026');
  });
});
