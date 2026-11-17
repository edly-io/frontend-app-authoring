import {
  initializeMocks,
  render,
  screen,
} from '@src/testUtils';
import { page, rawBadges, rawCourseBadge, rawCourseCurriculum, rawCurriculums } from './__mocks__/fixtures';
import { apiUrls } from './data/api';
import CourseBadgeLinks from './CourseBadgeLinks';

const renderLinks = (courseId: string) => {
  const { axiosMock } = initializeMocks();
  axiosMock.onGet(apiUrls.badgesPage(1)).reply(200, page([...rawBadges, rawCourseBadge]));
  axiosMock.onGet(apiUrls.curriculumsPage(1)).reply(200, page([...rawCurriculums, rawCourseCurriculum]));
  render(<CourseBadgeLinks courseId={courseId} />);
};

describe('<CourseBadgeLinks />', () => {
  it('links to the course badge that covers the course', async () => {
    renderLinks('course-v1:Uber+DRV201+2026_Q4');
    expect(await screen.findByRole('link', { name: 'Badge: Airport pro' })).toHaveAttribute(
      'href',
      `/curriculum-management/badges?open=${rawCourseBadge.uuid}`,
    );
  });

  it('says there is no badge, and links to the curriculum the course is in', async () => {
    renderLinks('course-v1:Uber+DRV101+2026_Q4');
    expect(await screen.findByText('No badge')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learning path: New driver essentials' })).toHaveAttribute(
      'href',
      '/curriculum-management?open=cur-1',
    );
  });

  it('labels a curriculum that uses the course as its knowledge check', async () => {
    renderLinks('course-v1:Uber+DRVKC1+2026_Q4');
    expect(await screen.findByRole('link', { name: 'Knowledge check: New driver essentials' })).toBeInTheDocument();
  });

  it('links a course in a Course without a knowledge check', async () => {
    renderLinks('course-v1:Uber+DRV101+2026_Q4');
    expect(await screen.findByRole('link', { name: 'Learning path: Airport pickups' })).toHaveAttribute(
      'href',
      '/curriculum-management?open=cur-3',
    );
  });
});
