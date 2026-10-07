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
    const select = screen.getByLabelText('Complete badge');
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'No badge' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Essentials complete' })).toBeDisabled();
    await userEvent.selectOptions(select, badges[0].uuid);
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
