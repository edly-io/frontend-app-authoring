import { initializeMocks, render, screen } from '@src/testUtils';

import BackLink from './BackLink';

describe('<BackLink />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('is a link to the given target with the given text', () => {
    render(<BackLink to="/course/abc" label="Back to Course Outline" />);
    expect(screen.getByRole('link', { name: 'Back to Course Outline' })).toHaveAttribute('href', '/course/abc');
  });

  it('shows a back arrow that screen readers skip', () => {
    const { container } = render(<BackLink to="/course/abc" label="Back to Publish History" />);
    const link = screen.getByRole('link', { name: 'Back to Publish History' });
    expect(link.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has vertical padding (not the cramped default of a plain link)', () => {
    render(<BackLink to="/x" label="Back" />);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveClass('py-2');
  });
});
