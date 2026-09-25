import { getConfig } from '@edx/frontend-platform';
import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import PricingSection from '.';

const courseId = 'course-v1:ArbOrg+PRC01+2026';
let axiosMock;

const pricingUrl = () => `${getConfig().STUDIO_BASE_URL}/rwaq/api/pricing/courses/${encodeURIComponent(courseId)}/`;

const pricingResponse = (overrides = {}) => ({
  pricing_category: 'is_free',
  price: null,
  discount: null,
  currency: 'SAR',
  pricing_managed_by_admin: false,
  part_of_program: null,
  part_of_program_name: null,
  can_edit: true,
  ...overrides,
});

const renderSection = async (overrides = {}) => {
  axiosMock.onGet(pricingUrl()).reply(200, pricingResponse(overrides));
  render(<PricingSection courseId={courseId} />);
  await screen.findByText('Learners enroll at no cost.');
};

describe('<PricingSection />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('renders the three course types with their descriptions', async () => {
    await renderSection();
    expect(screen.getByRole('heading', { name: 'Type of course' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Free' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Paid' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Program-only course' })).toBeInTheDocument();
    expect(screen.getByText('Sold on its own at the price set below.')).toBeInTheDocument();
    expect(screen.getByText('Offered only through the one program it is added to.')).toBeInTheDocument();
  });

  it('shows the price fields only for Paid', async () => {
    await renderSection();
    expect(screen.queryByLabelText('Price (SAR)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Paid' }));
    expect(screen.getByLabelText('Price (SAR)')).toBeInTheDocument();
    expect(screen.getByLabelText('Sale price (SAR)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Program-only course' }));
    expect(screen.queryByLabelText('Price (SAR)')).not.toBeInTheDocument();
  });

  it('selects no type when the course has none yet', async () => {
    await renderSection({ pricing_category: null });
    screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.getByText(/This course has no type yet/)).toBeInTheDocument();
  });

  it('validates the price and sale price on blur', async () => {
    await renderSection({ pricing_category: 'is_paid', price: '100.00' });
    const price = screen.getByLabelText('Price (SAR)');
    const salePrice = screen.getByLabelText('Sale price (SAR)');

    fireEvent.change(price, { target: { value: '0' } });
    fireEvent.blur(price);
    expect(screen.getByText('Price must be greater than 0.')).toBeInTheDocument();

    fireEvent.change(price, { target: { value: '100' } });
    fireEvent.blur(price);
    expect(screen.queryByText('Price must be greater than 0.')).not.toBeInTheDocument();

    fireEvent.change(salePrice, { target: { value: '100' } });
    fireEvent.blur(salePrice);
    expect(screen.getByText('Sale price must be lower than the price.')).toBeInTheDocument();

    fireEvent.change(salePrice, { target: { value: '80' } });
    fireEvent.blur(salePrice);
    expect(screen.queryByText('Sale price must be lower than the price.')).not.toBeInTheDocument();
  });

  it('does not save an invalid paid price', async () => {
    await renderSection();
    fireEvent.click(screen.getByRole('radio', { name: 'Paid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save course type' }));
    expect(await screen.findByText('Price must be greater than 0.')).toBeInTheDocument();
    expect(axiosMock.history.put).toHaveLength(0);
  });

  it('saves Free with a PUT and no price', async () => {
    await renderSection({ pricing_category: 'is_paid', price: '100.00' });
    axiosMock.onPut(pricingUrl()).reply(200, pricingResponse());
    fireEvent.click(screen.getByRole('radio', { name: 'Free' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save course type' }));
    expect(await screen.findByText('Course type saved.')).toBeInTheDocument();
    expect(axiosMock.history.delete).toHaveLength(0);
    expect(JSON.parse(axiosMock.history.put[0].data)).toEqual({
      pricing_category: 'is_free', price: null, discount: null,
    });
  });

  it('saves Paid with the price and sale price', async () => {
    await renderSection();
    axiosMock.onPut(pricingUrl()).reply(200, pricingResponse({
      pricing_category: 'is_paid', price: '100.00', discount: '80.00',
    }));
    fireEvent.click(screen.getByRole('radio', { name: 'Paid' }));
    fireEvent.change(screen.getByLabelText('Price (SAR)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Sale price (SAR)'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save course type' }));
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect(JSON.parse(axiosMock.history.put[0].data)).toEqual({
      pricing_category: 'is_paid', price: '100', discount: '80',
    });
  });

  it('attaches a backend error with a field to that field', async () => {
    await renderSection({ pricing_category: 'is_paid', price: '100.00' });
    axiosMock.onPut(pricingUrl()).reply(400, { detail: 'Price is too high.', field: 'price' });
    fireEvent.click(screen.getByRole('button', { name: 'Save course type' }));
    expect(await screen.findByText('Price is too high.')).toBeInTheDocument();
    expect(screen.queryByText('Regular price shown on the marketing site.')).not.toBeInTheDocument();
  });

  it('shows a backend error without a field as an alert', async () => {
    await renderSection();
    const detail = 'Learners have already enrolled in this free course. Create a rerun to change its type.';
    axiosMock.onPut(pricingUrl()).reply(409, { detail });
    fireEvent.click(screen.getByRole('radio', { name: 'Paid' }));
    fireEvent.change(screen.getByLabelText('Price (SAR)'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save course type' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(detail);
  });

  it('renders read-only when the course team cannot edit', async () => {
    await renderSection({ pricing_category: 'is_paid', price: '100.00', can_edit: false });
    expect(screen.getByText(/managed by the Rwaq admin/)).toBeInTheDocument();
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    expect(screen.getByLabelText('Price (SAR)')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save course type' })).not.toBeInTheDocument();
  });

  it('names the program the course is in', async () => {
    await renderSection({
      pricing_category: 'is_program_only',
      part_of_program: 'program-v1:ArbOrg+MASTERS+PAID1',
      part_of_program_name: 'Masters in Tax',
    });
    expect(screen.getByText(/This course is in the program Masters in Tax/)).toBeInTheDocument();
  });
});
