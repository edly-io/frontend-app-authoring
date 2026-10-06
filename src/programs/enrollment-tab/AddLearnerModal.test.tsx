import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AddLearnerModal from './AddLearnerModal';
import { mockLearner, mockPaginatedLearners } from '../data/api.mock';

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockEnrollMutate = jest.fn();
const mockUseLearners = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useLearners: (...args: any[]) => mockUseLearners(...args),
  useEnrollLearner: () => ({ mutateAsync: mockEnrollMutate, isPending: false }),
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  programId: 'prog-key-1',
  alreadyEnrolledIds: [],
};

describe('<AddLearnerModal />', () => {
  beforeEach(() => {
    initializeMocks();
    mockEnrollMutate.mockResolvedValue(undefined);
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([mockLearner()]),
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders learner list when open', () => {
    render(<AddLearnerModal {...defaultProps} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows "Enrolled" badge for already-enrolled learner', () => {
    const learner = mockLearner({ id: 'student.alice', username: 'student.alice' });
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([learner]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddLearnerModal {...defaultProps} alreadyEnrolledIds={['student.alice']} />);
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Enroll$/i })).not.toBeInTheDocument();
  });

  it('shows "Enroll" button for non-enrolled learner', () => {
    render(<AddLearnerModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^Enroll$/i })).toBeInTheDocument();
  });

  it('calls enrollLearner with programId and username when Enroll is clicked', async () => {
    const learner = mockLearner({ id: 'student.alice', username: 'student.alice' });
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([learner]),
      isLoading: false,
      isFetching: false,
    });
    render(<AddLearnerModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
    await waitFor(() => expect(mockEnrollMutate).toHaveBeenCalledWith({
      programId: 'prog-key-1',
      username: 'student.alice',
      reason: '',
    }));
  });

  it('sends the reason with the enrollment', async () => {
    render(<AddLearnerModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Reason/i), { target: { value: '  Scholarship ' } });
    fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
    await waitFor(() => expect(mockEnrollMutate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Scholarship' }),
    ));
  });

  it('shows the server\'s reason when the enrollment is refused', async () => {
    mockEnrollMutate.mockRejectedValue({
      response: { data: { detail: 'Only Rwaq admins can enroll learners into a paid program.' } },
    });
    render(<AddLearnerModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
    expect(await screen.findByText(/Only Rwaq admins can enroll/i)).toBeInTheDocument();
  });

  it('shows error alert when enrollment fails', async () => {
    mockEnrollMutate.mockRejectedValue(new Error('Server error'));
    render(<AddLearnerModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
    expect(await screen.findByText(/Failed to enroll learner/i)).toBeInTheDocument();
  });

  it('renders pagination when numPages > 1', () => {
    mockUseLearners.mockReturnValue({
      data: mockPaginatedLearners([mockLearner()], { numPages: 3 }),
      isLoading: false,
      isFetching: false,
    });
    render(<AddLearnerModal {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /Learner list pagination/i })).toBeInTheDocument();
  });

  it('passes enabled=false to useLearners when modal is closed', () => {
    render(<AddLearnerModal {...defaultProps} isOpen={false} />);
    expect(mockUseLearners).toHaveBeenCalledWith(
      expect.any(Object),
      false,
    );
  });

  describe('subscription program', () => {
    const subscriptionProps = { ...defaultProps, isSubscriptionProgram: true };
    const planSelect = () => screen.getByRole('combobox', { name: /Subscription plan/i });

    it('shows no plan select for a non-subscription program', () => {
      render(<AddLearnerModal {...defaultProps} />);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('offers only Monthly and Yearly, with a placeholder that is not a valid choice', () => {
      render(<AddLearnerModal {...subscriptionProps} />);
      const options = Array.from(planSelect().querySelectorAll('option'));
      expect(options.map((o) => o.textContent)).toEqual(['Select a plan', 'Monthly', 'Yearly']);
      expect(options[0]).toBeDisabled();
      expect(options.slice(1).map((o) => o.getAttribute('value'))).toEqual(['monthly', 'yearly']);
    });

    it('keeps Enroll disabled until a plan is picked', () => {
      render(<AddLearnerModal {...subscriptionProps} />);
      expect(screen.getByRole('button', { name: /^Enroll$/i })).toBeDisabled();
      fireEvent.change(planSelect(), { target: { value: 'yearly' } });
      expect(screen.getByRole('button', { name: /^Enroll$/i })).toBeEnabled();
    });

    it('sends the picked plan with the enrollment', async () => {
      render(<AddLearnerModal {...subscriptionProps} />);
      fireEvent.change(planSelect(), { target: { value: 'monthly' } });
      fireEvent.click(screen.getByRole('button', { name: /^Enroll$/i }));
      await waitFor(() => expect(mockEnrollMutate).toHaveBeenCalledWith({
        programId: 'prog-key-1',
        username: 'student.alice',
        reason: '',
        subscriptionPlan: 'monthly',
      }));
    });

    it('disables the plan select for a subscribed learner, shows the end date and sends no plan', async () => {
      mockUseLearners.mockReturnValue({
        data: mockPaginatedLearners([mockLearner({ subscriptionEndsAt: '2026-12-15T10:00:00Z' })]),
        isLoading: false,
        isFetching: false,
      });
      render(<AddLearnerModal {...subscriptionProps} />);
      expect(planSelect()).toBeDisabled();
      expect(screen.getByText(/Already has a subscription, ends .*2026/)).toBeInTheDocument();
      const enroll = screen.getByRole('button', { name: /^Enroll$/i });
      expect(enroll).toBeEnabled();
      fireEvent.click(enroll);
      await waitFor(() => expect(mockEnrollMutate).toHaveBeenCalled());
      expect(mockEnrollMutate.mock.calls[0][0].subscriptionPlan).toBeUndefined();
    });

    it('does not show subscription state in a non-subscription program', () => {
      mockUseLearners.mockReturnValue({
        data: mockPaginatedLearners([mockLearner({ subscriptionEndsAt: '2026-12-15T10:00:00Z' })]),
        isLoading: false,
        isFetching: false,
      });
      render(<AddLearnerModal {...defaultProps} />);
      expect(screen.queryByText(/Already has a subscription/)).not.toBeInTheDocument();
    });
  });
});
