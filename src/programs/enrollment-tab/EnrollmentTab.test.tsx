import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import EnrollmentTab from './EnrollmentTab';
import { mockLearner, mockPaginatedLearners } from '../data/api.mock';

const mockUseProgramEnrollments = jest.fn();
const mockBulkEnroll = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useProgramEnrollments: (...args: any[]) => mockUseProgramEnrollments(...args),
  // hooks used by child modals — supply minimal stubs
  useLearners: () => ({ data: { results: [], count: 0, numPages: 1 }, isLoading: false, isFetching: false }),
  useEnrollLearner: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useBulkEnrollProgram: () => ({ mutateAsync: mockBulkEnroll, isPending: false }),
  useCancelProgramInvite: () => ({ mutate: jest.fn(), isPending: false }),
}));

const programId = 'prog-key-1';

describe('<EnrollmentTab />', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([mockLearner()]),
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders enrolled learner list with name and email', () => {
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows the courses that could not be enrolled when an invitation was claimed', () => {
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([mockLearner({ courseFailures: ['course-v1:Org+Course+2026'] })]),
      isLoading: false,
      isFetching: false,
    });
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByText('Course enrollment failed: course-v1:Org+Course+2026')).toBeInTheDocument();
  });

  it('shows empty state message when no learners enrolled', () => {
    mockUseProgramEnrollments.mockReturnValue({
      data: mockPaginatedLearners([], { count: 0 }),
      isLoading: false,
      isFetching: false,
    });
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByText(/No learners enrolled yet/i)).toBeInTheDocument();
  });

  it('renders search field', () => {
    render(<EnrollmentTab programId={programId} />);
    expect(screen.getByPlaceholderText(/Search learners and invites/i)).toBeInTheDocument();
  });

  it('passes search query to useProgramEnrollments', () => {
    render(<EnrollmentTab programId={programId} />);
    const searchInput = screen.getByPlaceholderText(/Search learners and invites/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(mockUseProgramEnrollments).toHaveBeenCalledWith(
      programId,
      expect.objectContaining({ search: 'alice' }),
    );
  });

  it('offers no way to unenroll a learner', () => {
    render(<EnrollmentTab programId={programId} />);
    expect(screen.queryByRole('button', { name: /Unenroll/i })).not.toBeInTheDocument();
  });

  it('hides "Enroll Learner" when the user may not enroll into this paid program', () => {
    render(<EnrollmentTab programId={programId} canEnroll={false} />);
    expect(screen.queryByRole('button', { name: /Enroll Learner/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Only Rwaq admins can enroll learners/i)).toBeInTheDocument();
  });

  it('disables "Enroll Learner" for a subscription program, even for a superadmin, and says why', async () => {
    render(<EnrollmentTab programId={programId} canEnroll isSubscriptionProgram />);
    const button = screen.getByRole('button', { name: /Enroll Learner/i });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Learners join this program through their Rwaq subscription.',
    );
  });

  it('opens AddLearnerModal when "Enroll Learner" is clicked', () => {
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: /Enroll Learner/i }));
    expect(screen.getByText('Enroll Learner in Program')).toBeInTheDocument();
  });

  it('allows notification without auto enrollment in the bulk form', async () => {
    mockBulkEnroll.mockResolvedValue({
      enrolled: [], already_enrolled: [], invited: [], notification_failures: [], failed: [], course_failures: [],
    });
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bulk enroll' }));
    fireEvent.change(screen.getByLabelText('Email addresses'), { target: { value: 'learner@example.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Notify by email' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enroll learners' }));
    await waitFor(() => expect(mockBulkEnroll).toHaveBeenCalledWith({
      programId, emails: 'learner@example.com', reason: '', autoEnroll: false, notify: true,
    }));
  });

  it('explains pending invitations when auto enrollment and notification are off', async () => {
    mockBulkEnroll.mockResolvedValue({
      enrolled: [],
      already_enrolled: [],
      invited: [{ email: 'new@example.com' }],
      notification_failures: [],
      failed: [],
      course_failures: [],
    });
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bulk enroll' }));
    fireEvent.change(screen.getByLabelText('Email addresses'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enroll learners' }));
    expect(await screen.findByText('Invitations remain pending and will not enroll learners automatically.')).toBeInTheDocument();
    expect(screen.getByText('No invitation email was sent.')).toBeInTheDocument();
  });

  it('shows field errors next to the matching input', async () => {
    mockBulkEnroll.mockRejectedValue({ response: { data: { emails: ['Invalid email'], reason: ['Reason too long'] } } });
    render(<EnrollmentTab programId={programId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bulk enroll' }));
    fireEvent.change(screen.getByLabelText('Email addresses'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enroll learners' }));
    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByText('Reason too long')).toBeInTheDocument();
    expect(screen.getByLabelText('Email addresses')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Reason (optional)')).toHaveAttribute('aria-invalid', 'true');
  });
});
