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
});
