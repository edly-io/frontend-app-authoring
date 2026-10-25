import { PROGRAM_TABS, getActiveProgramTab } from './programTabs';

describe('getActiveProgramTab', () => {
  it('lists the twelve tabs in display order', () => {
    expect(PROGRAM_TABS).toEqual([
      'details', 'courses', 'instructors', 'enrollment', 'feedback', 'trainee-results', 'certificates',
      'calendar', 'requests', 'attendance', 'locations', 'holidays',
    ]);
  });

  it.each([
    [undefined, 'details'],
    ['', 'details'],
    ['nope', 'details'],
    ['feedback', 'feedback'],
    ['requests/leaves', 'requests'],
    ['attendance/sessions/5', 'attendance'],
  ])('maps %p to %p', (splat, expected) => {
    expect(getActiveProgramTab(splat)).toBe(expected);
  });
});
