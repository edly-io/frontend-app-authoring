import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import { rawBadges } from '../__mocks__/fixtures';
import type { Badge } from '../types';
import BadgeSlotSelect from './BadgeSlotSelect';

const badges = camelCaseObject(rawBadges) as Badge[];

describe('<BadgeSlotSelect />', () => {
  beforeEach(() => initializeMocks());

  it('offers "No badge" and the given badges, disables ones taken by other slots, and reports the choice', async () => {
    const onChange = jest.fn();
    render(
      <BadgeSlotSelect
        slot="complete"
        value=""
        badges={badges}
        takenBadgeUuids={[badges[1].uuid]}
        onChange={onChange}
      />,
    );
    const toggle = screen.getByLabelText(/Complete badge/);
    expect(toggle).toHaveAccessibleName('Complete badge No badge');
    // The visible label points at the toggle (no orphan <label>).
    expect(screen.getByText('Complete badge', { selector: 'label' })).toHaveAttribute('for', toggle.id);
    await userEvent.click(toggle);
    const items = screen.getAllByRole('button').filter((el) => el.classList.contains('dropdown-item'));
    expect(items[0]).toHaveTextContent('No badge');
    expect(items[0]).toHaveClass('active');
    expect(screen.getByTitle('Essentials complete')).toHaveClass('disabled');
    await userEvent.click(screen.getByTitle(badges[0].title));
    expect(onChange).toHaveBeenCalledWith(badges[0].uuid);
  });

  it.each(
    [
      ['complete', 'Every curriculum course completed'],
      ['retained', 'Knowledge check passed after it unlocks'],
    ] as const,
  )('explains when the %s badge is earned', (slot, rule) => {
    render(
      <BadgeSlotSelect
        slot={slot}
        value=""
        badges={badges}
        takenBadgeUuids={[]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText(rule)).toBeInTheDocument();
  });

  it('shows the chosen badge on the toggle and disables it when locked', () => {
    render(
      <BadgeSlotSelect
        slot="complete"
        value={badges[0].uuid}
        badges={badges}
        takenBadgeUuids={[]}
        onChange={jest.fn()}
        locked
      />,
    );
    const toggle = screen.getByLabelText(/Complete badge/);
    expect(toggle).toHaveAccessibleName(`Complete badge ${badges[0].title}`);
    expect(toggle).toBeDisabled();
  });

  it('shows an error under the select', () => {
    render(
      <BadgeSlotSelect
        slot="retained"
        value=""
        badges={badges}
        takenBadgeUuids={[]}
        onChange={jest.fn()}
        error="Badge not found."
      />,
    );
    expect(screen.getByText('Badge not found.')).toBeInTheDocument();
  });
});
