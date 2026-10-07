import { useIntl } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';

import type { Badge, SlotKey } from '../types';
import { slotMessages } from '../utils';
import messages from '../messages';

interface BadgeSlotSelectProps {
  slot: SlotKey;
  /** The chosen badge's UUID, or '' for no badge. */
  value: string;
  /** Curriculum badges only (spec R11); the caller filters out course badges. */
  badges: Badge[];
  /** Badges already chosen in the curriculum's other slots (one slot per badge, R7). */
  takenBadgeUuids: string[];
  onChange: (badgeUuid: string) => void;
  error?: string;
}

/** One curriculum badge slot. Not required: "No badge" leaves the slot empty (spec R6). */
const BadgeSlotSelect = ({
  slot,
  value,
  badges,
  takenBadgeUuids,
  onChange,
  error,
}: BadgeSlotSelectProps) => {
  const intl = useIntl();
  const slotLabel = intl.formatMessage(slotMessages[slot].label);
  return (
    <Form.Group controlId={`curriculum-badge-slot-${slot}`} isInvalid={!!error}>
      <Form.Label>{intl.formatMessage(messages.slotSelectLabel, { slot: slotLabel })}</Form.Label>
      <Form.Control
        as="select"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        <option value="">{intl.formatMessage(messages.noBadgeOption)}</option>
        {badges.map((badge) => (
          <option key={badge.uuid} value={badge.uuid} disabled={takenBadgeUuids.includes(badge.uuid)}>
            {badge.title}
          </option>
        ))}
      </Form.Control>
      <Form.Text>{intl.formatMessage(slotMessages[slot].rule)}</Form.Text>
      {error && <Form.Control.Feedback type="invalid" hasIcon={false}>{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

export default BadgeSlotSelect;
