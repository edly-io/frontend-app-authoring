import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import ProgramDetailPage from './ProgramDetailPage';
import { mockProgram } from './data/api.mock';
import type { Program } from './data/types';

const mockUpdateProgram = jest.fn();
const mockUseProgramDetail = jest.fn();

jest.mock('@src/programs/data/apiHooks', () => ({
  useProgramDetail: (...args: any[]) => mockUseProgramDetail(...args),
  useUpdateProgram: () => ({ mutateAsync: mockUpdateProgram, isPending: false }),
}));
jest.mock('../header', () => jest.fn(() => <div data-testid="mock-header" />));
jest.mock('@edx/frontend-component-footer', () => ({
  StudioFooterSlot: jest.fn(() => <div data-testid="mock-footer" />),
}));
jest.mock('../generic/RichTextEditor', () => jest.fn(() => <div data-testid="mock-editor" />));
jest.mock('./courses-tab/CoursesTab', () => jest.fn(() => null));
jest.mock('./instructors-tab/InstructorsTab', () => jest.fn(() => null));
jest.mock('./enrollment-tab/EnrollmentTab', () => jest.fn(() => null));

const programId = 'program-v1:ArbOrg+MASTERS+PAID1';

const renderPage = (overrides: Partial<Program> = {}) => {
  mockUseProgramDetail.mockReturnValue({
    data: { program: mockProgram({ id: programId, status: 'draft', ...overrides }) },
    isLoading: false,
    isError: false,
  });
  return render(<ProgramDetailPage />, { path: '/programs/:programId', params: { programId } });
};

const saveProgram = () => fireEvent.click(screen.getByRole('button', { name: 'Save Program' }));

describe('<ProgramDetailPage /> pricing', () => {
  beforeEach(() => {
    initializeMocks();
    mockUpdateProgram.mockResolvedValue(undefined);
  });

  it('keeps pricing editable', () => {
    renderPage({ pricingCategory: 'is_paid', price: '100.00' });
    expect(screen.getByLabelText('Pricing type')).toBeEnabled();
    expect(screen.getByLabelText('Price (SAR)')).toBeEnabled();
    expect(screen.getByLabelText('Sale price (SAR)')).toBeEnabled();
    expect(screen.queryByText(/managed by the Rwaq admin/)).not.toBeInTheDocument();
  });

  it('validates the price and sale price on blur', async () => {
    renderPage({ pricingCategory: 'is_paid', price: '100.00' });
    const price = screen.getByLabelText('Price (SAR)');
    fireEvent.change(price, { target: { value: '0' } });
    fireEvent.blur(price);
    expect(await screen.findByText('Price must be greater than 0.')).toBeInTheDocument();

    fireEvent.change(price, { target: { value: '100' } });
    const salePrice = screen.getByLabelText('Sale price (SAR)');
    fireEvent.change(salePrice, { target: { value: '120' } });
    fireEvent.blur(salePrice);
    expect(await screen.findByText('Sale price must be lower than the price.')).toBeInTheDocument();
    expect(screen.queryByText('Price must be greater than 0.')).not.toBeInTheDocument();
  });

  it('shows a pricing field error from the backend', async () => {
    const detail = "It's a free program. Learners have already enrolled into this program. Create a new program to make it paid.";
    mockUpdateProgram.mockRejectedValue({ response: { status: 400, data: { pricing_category: [detail] } } });
    renderPage();
    fireEvent.change(screen.getByLabelText('Pricing type'), { target: { value: 'is_paid' } });
    fireEvent.change(screen.getByLabelText('Price (SAR)'), { target: { value: '100' } });
    saveProgram();
    expect(await screen.findByText(detail)).toBeInTheDocument();
  });

  describe('activating a free program', () => {
    const activate = () => {
      fireEvent.change(screen.getByLabelText('Program Status'), { target: { value: 'active' } });
      saveProgram();
    };

    it('asks first, then saves on "Continue as free"', async () => {
      renderPage();
      activate();
      expect(await screen.findByText('Activate a free program?')).toBeInTheDocument();
      expect(mockUpdateProgram).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Continue as free' }));
      await waitFor(() => expect(mockUpdateProgram).toHaveBeenCalledTimes(1));
      expect(mockUpdateProgram.mock.calls[0][0].data).toMatchObject({ status: 'active', pricingCategory: '' });
    });

    it('focuses the pricing type on "Make it paid" and does not save', async () => {
      renderPage();
      activate();
      fireEvent.click(await screen.findByRole('button', { name: 'Make it paid' }));
      await waitFor(() => expect(screen.getByLabelText('Pricing type')).toHaveFocus());
      expect(screen.queryByText('Activate a free program?')).not.toBeInTheDocument();
      expect(mockUpdateProgram).not.toHaveBeenCalled();
    });

    it('does not ask for a paid program', async () => {
      renderPage({ pricingCategory: 'is_paid', price: '100.00' });
      activate();
      await waitFor(() => expect(mockUpdateProgram).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('Activate a free program?')).not.toBeInTheDocument();
    });

    it('does not ask when the program is already active', async () => {
      renderPage({ status: 'active' });
      saveProgram();
      await waitFor(() => expect(mockUpdateProgram).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('Activate a free program?')).not.toBeInTheDocument();
    });
  });
});
