import { getConfig, setConfig } from '@edx/frontend-platform';

import { getInstructorDashboardLink } from './utils';

describe('getInstructorDashboardLink', () => {
  const originalConfig = getConfig();
  const courseId = 'course-v1:org+code+run';

  afterEach(() => {
    setConfig(originalConfig);
  });

  it.each([null, undefined, ''])('returns undefined when INSTRUCTOR_MICROFRONTEND_URL is %p', (value) => {
    setConfig({ ...originalConfig, INSTRUCTOR_MICROFRONTEND_URL: value });

    expect(getInstructorDashboardLink(courseId)).toBeUndefined();
  });

  it('appends the course id and course_info to INSTRUCTOR_MICROFRONTEND_URL', () => {
    setConfig({ ...originalConfig, INSTRUCTOR_MICROFRONTEND_URL: 'http://apps.local.openedx.io/instructor-dashboard' });

    expect(getInstructorDashboardLink(courseId))
      .toBe('http://apps.local.openedx.io/instructor-dashboard/course-v1:org+code+run/course_info');
  });

  it('does not produce a double slash when the base URL has a trailing slash', () => {
    setConfig({
      ...originalConfig,
      INSTRUCTOR_MICROFRONTEND_URL: 'http://apps.local.openedx.io/instructor-dashboard/',
    });

    expect(getInstructorDashboardLink(courseId))
      .toBe('http://apps.local.openedx.io/instructor-dashboard/course-v1:org+code+run/course_info');
  });
});
