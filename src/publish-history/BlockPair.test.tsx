import { initializeMocks, render, screen, within } from '@src/testUtils';

import BlockPair from './BlockPair';
import type { Slot } from './BlockPair';
import type { Age } from './types';

const slots: Slot[] = [
  { key: 'a', render: (side: Age) => <span>{`first ${side}`}</span> },
  { key: 'b', render: (side: Age) => <span>{`second ${side}`}</span> },
];
const label = (side: Age) => `Block, ${side} version`;
const cards = () => screen.getAllByRole('group');

describe('<BlockPair />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders two separate cards, left then right, in the order of the columns', () => {
    render(<BlockPair columns={['older', 'newer']} slots={slots} label={label} />);
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['Block, older version', 'Block, newer version']);
  });

  it('puts the newer card on the left when the columns are swapped', () => {
    render(<BlockPair columns={['newer', 'older']} slots={slots} label={label} />);
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['Block, newer version', 'Block, older version']);
    expect(within(cards()[0]).getByText('first newer')).toBeInTheDocument();
  });

  it('renders the same slots in the same order in both cards', () => {
    render(<BlockPair columns={['older', 'newer']} slots={slots} label={label} />);
    expect(cards()[0]).toHaveTextContent('first oldersecond older');
    expect(cards()[1]).toHaveTextContent('first newersecond newer');
  });

  it('gives both cards the same grid row span: header plus slots', () => {
    render(<BlockPair columns={['older', 'newer']} slots={slots} header={() => <span>Head</span>} label={label} />);
    cards().forEach((c) => expect(c.getAttribute('style')).toContain('grid-row: 1 / span 3'));
    expect(cards()[0].getAttribute('style')).toContain('grid-column: 1');
    expect(cards()[1].getAttribute('style')).toContain('grid-column: 2');
  });

  it('renders a header in each card when given one, and none otherwise', () => {
    const { rerender } = render(
      <BlockPair columns={['older', 'newer']} slots={slots} header={(s) => <span>{`Head ${s}`}</span>} label={label} />,
    );
    expect(within(cards()[0]).getByText('Head older')).toBeInTheDocument();
    expect(within(cards()[1]).getByText('Head newer')).toBeInTheDocument();
    rerender(<BlockPair columns={['older', 'newer']} slots={slots} label={label} />);
    expect(screen.queryByText(/^Head/)).not.toBeInTheDocument();
  });

  it.each(
    [
      ['older', 'newer'],
      ['newer', 'older'],
    ] as const,
  )('shows "Not in this version" on the absent side only (columns %s, %s)', (left, right) => {
    render(
      <BlockPair
        columns={[left, right]}
        slots={slots}
        header={(s) => <span>{`Head ${s}`}</span>}
        absent="older"
        label={label}
      />,
    );
    const older = screen.getByRole('group', { name: 'Block, older version' });
    const newer = screen.getByRole('group', { name: 'Block, newer version' });
    expect(older).toHaveTextContent('Not in this version');
    expect(older).not.toHaveTextContent('first');
    expect(older).not.toHaveTextContent('Head');
    expect(newer).not.toHaveTextContent('Not in this version');
    expect(newer).toHaveTextContent('first newer');
    expect(cards()[0]).toBe(left === 'older' ? older : newer);
  });

  it('shows the placeholder on the newer side for a removed block', () => {
    render(<BlockPair columns={['older', 'newer']} slots={slots} absent="newer" label={label} />);
    expect(screen.getByRole('group', { name: 'Block, newer version' })).toHaveTextContent('Not in this version');
    expect(screen.getAllByText('Not in this version')).toHaveLength(1);
  });

  it('renders at least one grid row when there are no slots and no header', () => {
    render(<BlockPair columns={['older', 'newer']} slots={[]} label={label} />);
    cards().forEach((c) => expect(c.getAttribute('style')).toContain('grid-row: 1 / span 1'));
  });
});
