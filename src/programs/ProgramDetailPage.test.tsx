import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
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

const arabic = {
  'programs.detail.status.draft': 'مسودة',
  'programs.detail.status.active': 'نشط',
  'programs.detail.status.archived': 'مؤرشف',
  'programs.detail.badge.featured': 'مميز',
  'programs.detail.start-date.placeholder': 'اختر تاريخ البدء',
  'programs.detail.end-date.placeholder': 'اختر تاريخ الانتهاء',
};

const renderPage = (overrides: Partial<Program> = {}, locale = 'en') => {
  mockUseProgramDetail.mockReturnValue({
    data: {
      program: mockProgram({
        id: programId, status: 'draft', pricingCategory: 'is_free', ...overrides,
      }),
    },
    isLoading: false,
    isError: false,
  });
  return render(<ProgramDetailPage />, {
    path: '/programs/:programId',
    params: { programId },
    extraWrapper: ({ children }) => <IntlProvider locale={locale} messages={locale === 'ar' ? arabic : {}}>{children}</IntlProvider>,
  });
};

const saveProgram = () => fireEvent.click(screen.getByRole('button', { name: 'Save Program' }));

describe('<ProgramDetailPage /> pricing', () => {
  beforeAll(() => { mergeConfig({ SITE_NAME: 'Arbisoft' }); });
  let mockShowToast: jest.Mock;

  beforeEach(() => {
    mockShowToast = initializeMocks().mockShowToast as jest.Mock;
    mockUpdateProgram.mockResolvedValue(undefined);
  });

  it('localizes program labels owned by the app in Arabic', () => {
    renderPage({
      status: 'active',
      programType: 'MASTERS',
      isFeatured: true,
      pricingCategory: 'is_paid',
      regularPrice: '30.00',
      vatRate: '15.00',
      startDate: '2026-11-01',
    }, 'ar');
    expect(screen.getByRole('option', { name: 'نشط' })).toBeInTheDocument();
    expect(screen.getAllByText('مميز')).toHaveLength(2);
    expect(screen.getByPlaceholderText('اختر تاريخ الانتهاء')).toBeInTheDocument();
  });

  it('keeps pricing editable', () => {
    renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00' });
    ['Free', 'Paid', 'Part of Subscription'].forEach((name) => {
      expect(screen.getByRole('radio', { name })).toBeEnabled();
    });
    expect(screen.getByRole('radio', { name: 'Paid' })).toBeChecked();
    expect(screen.getByLabelText('Price before VAT (SAR)')).toBeEnabled();
    expect(screen.getByLabelText('Discounted Price / Sale Price before VAT (SAR)')).toBeEnabled();
    expect(screen.queryByText(/managed by the Arbisoft admin/)).not.toBeInTheDocument();
  });

  it('computes the discount percentage live from the inputs', () => {
    renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00' });
    const price = screen.getByLabelText('Price before VAT (SAR)');
    const sale = screen.getByLabelText('Discounted Price / Sale Price before VAT (SAR)');
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    fireEvent.change(price, { target: { value: '200' } });
    fireEvent.change(sale, { target: { value: '150' } });
    expect(screen.getByText('25% off')).toBeInTheDocument();
    expect(mockUpdateProgram).not.toHaveBeenCalled();
    fireEvent.change(price, { target: { value: '300' } });
    expect(screen.getByText('50% off')).toBeInTheDocument();
    fireEvent.change(sale, { target: { value: '300' } });
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    fireEvent.change(sale, { target: { value: '350' } });
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    fireEvent.change(sale, { target: { value: '150' } });
    expect(screen.getByText('50% off')).toBeInTheDocument();
    fireEvent.change(sale, { target: { value: '' } });
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });

  describe('price with VAT line', () => {
    const line = () => screen.queryByTestId('price-with-vat');
    const price = () => screen.getByLabelText('Price before VAT (SAR)');
    const sale = () => screen.getByLabelText('Discounted Price / Sale Price before VAT (SAR)');

    it('shows the regular price with VAT', () => {
      renderPage({ pricingCategory: 'is_paid', regularPrice: '30.00', vatRate: '15.00' });
      expect(line()).toHaveTextContent('Learner pays 34.50 SAR including 15% VAT');
      expect(line()).toHaveClass('font-weight-bold');
    });

    it('uses the sale price when it is set and valid', () => {
      renderPage({
        pricingCategory: 'is_paid', regularPrice: '100.00', salePrice: '30.00', vatRate: '15.00',
      });
      expect(line()).toHaveTextContent('Learner pays 34.50 SAR including 15% VAT');
    });

    it('updates live while typing and hides when the price is invalid or empty', () => {
      renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00', vatRate: '15.00' });
      fireEvent.change(sale(), { target: { value: '30' } });
      expect(line()).toHaveTextContent('Learner pays 34.50 SAR including 15% VAT');
      fireEvent.change(sale(), { target: { value: '' } });
      expect(line()).toHaveTextContent('Learner pays 115.00 SAR including 15% VAT');
      fireEvent.change(price(), { target: { value: 'abc' } });
      expect(line()).not.toBeInTheDocument();
      fireEvent.change(price(), { target: { value: '' } });
      expect(line()).not.toBeInTheDocument();
    });

    it('uses the label from the API', () => {
      renderPage({
        pricingCategory: 'is_paid', regularPrice: '30.00', vatRate: '15.00', vatLabel: 'GST',
      });
      expect(line()).toHaveTextContent('Learner pays 34.50 SAR including 15% GST');
    });

    it('falls back to the word VAT when the label is empty', () => {
      renderPage({
        pricingCategory: 'is_paid', regularPrice: '30.00', vatRate: '15.00', vatLabel: '',
      });
      expect(line()).toHaveTextContent('Learner pays 34.50 SAR including 15% VAT');
    });

    it('is hidden when the VAT rate is 0', () => {
      renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00', vatRate: '0.00' });
      expect(line()).not.toBeInTheDocument();
    });

    it('is hidden when the VAT rate is missing', () => {
      renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00' });
      expect(line()).not.toBeInTheDocument();
    });
  });

  it('validates the price and sale price on blur', async () => {
    renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00' });
    const price = screen.getByLabelText('Price before VAT (SAR)');
    fireEvent.change(price, { target: { value: '0' } });
    fireEvent.blur(price);
    expect(await screen.findByText('Price must be greater than 0.')).toBeInTheDocument();

    fireEvent.change(price, { target: { value: '100' } });
    const salePrice = screen.getByLabelText('Discounted Price / Sale Price before VAT (SAR)');
    fireEvent.change(salePrice, { target: { value: '120' } });
    fireEvent.blur(salePrice);
    expect(await screen.findByText('Sale price must be lower than the price.')).toBeInTheDocument();
    expect(screen.queryByText('Price must be greater than 0.')).not.toBeInTheDocument();
  });

  it('shows a pricing field error from the backend', async () => {
    const detail = "It's a free program. Learners have already enrolled into this program. Create a new program to make it paid.";
    mockUpdateProgram.mockRejectedValue({ response: { status: 400, data: { pricing_category: [detail] } } });
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: 'Paid' }));
    fireEvent.change(screen.getByLabelText('Price before VAT (SAR)'), { target: { value: '100' } });
    saveProgram();
    expect(await screen.findByText(detail)).toBeInTheDocument();
    expect(mockShowToast).not.toHaveBeenCalledWith('Failed to save program. Please try again.');
  });

  it('checks the radio of the stored type', () => {
    renderPage({ pricingCategory: 'is_part_of_subscription' });
    expect(screen.getByRole('radio', { name: 'Part of Subscription' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Free' })).not.toBeChecked();
    expect(screen.queryByLabelText('Price before VAT (SAR)')).not.toBeInTheDocument();
  });

  it('clears the prices when switching from Paid to Free', async () => {
    renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00', salePrice: '80.00' });
    fireEvent.click(screen.getByRole('radio', { name: 'Free' }));
    expect(screen.queryByLabelText('Price before VAT (SAR)')).not.toBeInTheDocument();
    saveProgram();
    await waitFor(() => expect(mockUpdateProgram).toHaveBeenCalledTimes(1));
    expect(mockUpdateProgram.mock.calls[0][0].data).toMatchObject({
      pricingCategory: 'is_free', regularPrice: '', salePrice: '',
    });
  });

  it('clears the end date so the program is open-ended', async () => {
    renderPage({ startDate: '2026-09-19', endDate: '2027-01-01' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    saveProgram();
    await waitFor(() => expect(mockUpdateProgram).toHaveBeenCalledTimes(1));
    expect(mockUpdateProgram.mock.calls[0][0].data).toMatchObject({ startDate: '2026-09-19', endDate: '' });
  });

  it('saves the day picked for a new end date, whatever the time zone', async () => {
    renderPage({ startDate: '2030-03-01', endDate: '2030-06-01' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByLabelText('End Date'));
    fireEvent.click(screen.getByRole('option', { name: /March 20th, 2030/ }));
    saveProgram();
    await waitFor(() => expect(mockUpdateProgram).toHaveBeenCalledTimes(1));
    expect(mockUpdateProgram.mock.calls[0][0].data).toMatchObject({ startDate: '2030-03-01', endDate: '2030-03-20' });
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
      expect(mockUpdateProgram.mock.calls[0][0].data).toMatchObject({ status: 'active', pricingCategory: 'is_free' });
    });

    it('focuses the pricing type on "Make it paid" and does not save', async () => {
      renderPage();
      activate();
      fireEvent.click(await screen.findByRole('button', { name: 'Make it paid' }));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Paid' })).toHaveFocus());
      expect(screen.queryByText('Activate a free program?')).not.toBeInTheDocument();
      expect(mockUpdateProgram).not.toHaveBeenCalled();
    });

    it('does not ask for a paid program', async () => {
      renderPage({ pricingCategory: 'is_paid', regularPrice: '100.00' });
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
