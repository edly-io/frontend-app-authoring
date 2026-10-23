import { initializeMocks, render, screen } from '@src/testUtils';
import AttendanceSubNav from './AttendanceSubNav';
import { PROGRAM_KEY } from './testFixtures';

const renderSubNav = () => render(<AttendanceSubNav programId={PROGRAM_KEY} />, {
  routerProps: { initialEntries: [`/programs/${PROGRAM_KEY}/attendance/by-course`] },
});

describe('admin sub-nav', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders By Course and By Learner links', () => {
    renderSubNav();
    expect(screen.getByText('By Course')).toBeInTheDocument();
    expect(screen.getByText('By Learner')).toBeInTheDocument();
  });

  it('renders a nav element with accessible label', () => {
    renderSubNav();
    expect(screen.getByRole('navigation', { name: /attendance sub-sections/i })).toBeInTheDocument();
  });

  it('links each sub-tab under the Studio attendance tab', () => {
    renderSubNav();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      `/programs/${PROGRAM_KEY}/attendance/dashboard`,
    );
  });
});
