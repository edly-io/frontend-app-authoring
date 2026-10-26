import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';

import CompareSummary from './CompareSummary';
import { diffResult, node } from './testHelpers';

const renderSummary = (overrides = {}, handlers = {}) =>
  render(
    <CompareSummary data={diffResult(overrides)} onExpandAll={jest.fn()} onCollapseAll={jest.fn()} {...handlers} />,
  );

describe('<CompareSummary />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('tells that some fields were not compared when the diff budget ran out', () => {
    renderSummary({ budgetExhausted: true });
    expect(screen.getByText(/Too many changes to compare in full/)).toBeInTheDocument();
  });

  it('does not say so when the budget held', () => {
    renderSummary({ budgetExhausted: false });
    expect(screen.queryByText(/Too many changes to compare in full/)).not.toBeInTheDocument();
  });

  it('counts each kind of change in the tree', () => {
    renderSummary({
      totalChanges: 3,
      tree: [
        node({ change: 'ADDED' }),
        node({ usageKey: 'b', change: 'ADDED' }),
        node({ usageKey: 'c', change: 'REMOVED' }),
      ],
    });
    expect(screen.getByText('2 added')).toBeInTheDocument();
    expect(screen.getByText('1 removed')).toBeInTheDocument();
    expect(screen.queryByText(/changed$/)).not.toBeInTheDocument();
  });

  it('calls the expand and collapse handlers', async () => {
    const onExpandAll = jest.fn();
    const onCollapseAll = jest.fn();
    renderSummary({}, { onExpandAll, onCollapseAll });
    await userEvent.click(screen.getByRole('button', { name: 'Expand All' }));
    await userEvent.click(screen.getByRole('button', { name: 'Collapse All' }));
    expect(onExpandAll).toHaveBeenCalledTimes(1);
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });
});
