import { initializeMocks, render, screen } from '@src/testUtils';
import BulkEnrollModal from './BulkEnrollModal';

describe('BulkEnrollModal', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('shows no error marks before anything is submitted', () => {
    render(<BulkEnrollModal isOpen onClose={jest.fn()} programId="program-v1:org+type+run" isPaid={false} />);
    expect(document.querySelector('.pgn__form-text-invalid, .invalid-feedback')).toBeNull();
  });

  it('puts each checkbox on its own line', () => {
    render(<BulkEnrollModal isOpen onClose={jest.fn()} programId="program-v1:org+type+run" isPaid={false} />);
    const autoEnroll = screen.getByLabelText('Auto enroll people when they register with this email address');
    const notify = screen.getByLabelText('Notify by email');
    expect(autoEnroll.closest('div[class="mb-2"]')).not.toBe(notify.closest('div'));
    expect(autoEnroll.closest('div[class="mb-2"]')?.contains(notify)).toBe(false);
  });
});
