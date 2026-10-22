import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import TruncatedName from './TruncatedName';

const LONG = 'A very long category name that does not fit in its row';

/** jsdom has no layout: give an element the widths a browser would measure. */
const setWidths = (element: HTMLElement, scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
};

describe('<TruncatedName />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('shows the full name in a tooltip on hover when the name is cut off', async () => {
    render(<TruncatedName id="name-tip" name={LONG} className="text-truncate" />);
    const name = screen.getByText(LONG);
    setWidths(name, 400, 120);

    await userEvent.hover(name);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(LONG);

    await userEvent.unhover(name);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('shows the tooltip when the box around the name clips it (a chip label)', async () => {
    render(
      <div data-testid="label">
        <TruncatedName id="chip-tip" name={LONG} />
      </div>,
    );
    setWidths(screen.getByText(LONG), 120, 120);
    setWidths(screen.getByTestId('label'), 400, 120);

    await userEvent.hover(screen.getByText(LONG));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(LONG);
  });

  it('shows no tooltip when the whole name fits', async () => {
    render(
      <div data-testid="label">
        <TruncatedName id="short-tip" name="Road Safety" />
      </div>,
    );
    setWidths(screen.getByText('Road Safety'), 80, 80);
    setWidths(screen.getByTestId('label'), 80, 200);

    await userEvent.hover(screen.getByText('Road Safety'));
    // Give a tooltip the chance to appear before asserting it didn't.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
