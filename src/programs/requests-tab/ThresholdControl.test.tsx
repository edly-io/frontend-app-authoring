import {
  fireEvent, initializeMocks, render, screen,
} from '@src/testUtils';
import ThresholdControl from './ThresholdControl';

const renderControl = (value: number | '' = 7) => {
  const onChange = jest.fn();
  render(<ThresholdControl value={value} onChange={onChange} />);
  return onChange;
};

describe('ThresholdControl', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders the value in a labelled number field', () => {
    renderControl();
    expect(screen.getByLabelText(/leave threshold/i)).toHaveValue(7);
  });

  it('increments with the + button', () => {
    const onChange = renderControl();
    fireEvent.click(screen.getByRole('button', { name: /increase threshold/i }));
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('decrements with the − button', () => {
    const onChange = renderControl();
    fireEvent.click(screen.getByRole('button', { name: /decrease threshold/i }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('disables − at the minimum', () => {
    renderControl(0);
    expect(screen.getByRole('button', { name: /decrease threshold/i })).toBeDisabled();
  });

  it('reports typed values as numbers', () => {
    const onChange = renderControl();
    fireEvent.change(screen.getByLabelText(/leave threshold/i), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith(12);
  });
});
