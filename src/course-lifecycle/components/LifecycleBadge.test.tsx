import { initializeMocks, render, screen } from '@src/testUtils';
import { LifecycleBadge } from './LifecycleBadge';

describe('<LifecycleBadge />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders "Draft" badge for draft state', () => {
    render(<LifecycleBadge state="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders "Submitted for Review" badge for for_review state', () => {
    render(<LifecycleBadge state="for_review" />);
    expect(screen.getByText('Submitted for Review')).toBeInTheDocument();
  });

  it('renders "Approved" badge for approved state', () => {
    render(<LifecycleBadge state="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders "Published" badge for published state', () => {
    render(<LifecycleBadge state="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('adds lifecycle-badge class to every state', () => {
    const { container } = render(<LifecycleBadge state="approved" />);
    expect(container.querySelector('.lifecycle-badge')).toBeInTheDocument();
  });
});
