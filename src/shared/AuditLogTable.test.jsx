import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import AuditLogTable from './AuditLogTable';
import { getAuditLogs } from './auditLogApi';

jest.mock('./auditLogApi', () => ({
  getAuditLogs: jest.fn(),
}));

const defaultProps = {
  appLabel: 'fbr_programs',
  models: ['programcourse'],
};

describe('<AuditLogTable />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders empty state when no logs returned', async () => {
    getAuditLogs.mockResolvedValue({ results: [], count: 0, next: null });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No activity recorded yet\./i)).toBeInTheDocument();
    });
  });

  it('renders log entries', async () => {
    getAuditLogs.mockResolvedValue({
      results: [
        {
          id: 1,
          timestamp: '2026-09-01T10:00:00Z',
          actor_name: 'admin',
          actor_email: 'admin@test.com',
          actor_role: undefined,
          action: 'created',
          record_type: 'programcourse',
          object_repr: 'Test Enrollment',
          changes: {},
          object_pk: '1',
        },
      ],
      count: 1,
      next: null,
    });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  it('action filter changes the displayed option', async () => {
    getAuditLogs.mockResolvedValue({ results: [], count: 0, next: null });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No activity recorded yet\./i)).toBeInTheDocument();
    });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '0' } });
    expect(select.value).toBe('0');
  });

  it('search input filters results', async () => {
    getAuditLogs.mockResolvedValue({ results: [], count: 0, next: null });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No activity recorded yet\./i)).toBeInTheDocument();
    });
    jest.useFakeTimers();
    const searchInput = screen.getByPlaceholderText(/Search by record name/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    jest.runAllTimers();
    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alice' }),
      );
    });
    jest.useRealTimers();
  });

  it('date range from input updates state', async () => {
    getAuditLogs.mockResolvedValue({ results: [], count: 0, next: null });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No activity recorded yet\./i)).toBeInTheDocument();
    });
    const fromInput = screen.getByLabelText('From');
    fireEvent.change(fromInput, { target: { value: '2026-09-01' } });
    expect(fromInput.value).toBe('2026-09-01');
  });

  it('date range to input has min set to from value', async () => {
    getAuditLogs.mockResolvedValue({ results: [], count: 0, next: null });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No activity recorded yet\./i)).toBeInTheDocument();
    });
    const fromInput = screen.getByLabelText('From');
    fireEvent.change(fromInput, { target: { value: '2026-09-01' } });
    const toInput = screen.getByLabelText('To');
    expect(toInput).toHaveAttribute('min', '2026-09-01');
  });

  it('renders actor name from log entry', async () => {
    getAuditLogs.mockResolvedValue({
      results: [
        {
          id: 42,
          timestamp: '2026-09-01T10:00:00Z',
          actor_name: 'user1',
          actor_email: 'user1@test.com',
          actor_role: undefined,
          action: 'updated',
          record_type: 'programcourse',
          object_repr: 'Some Record',
          changes: {},
          object_pk: '42',
        },
      ],
      count: 1,
      next: null,
    });
    render(<AuditLogTable {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });
});
