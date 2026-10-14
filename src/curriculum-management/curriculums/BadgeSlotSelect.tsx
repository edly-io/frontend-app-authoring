import { useIntl } from '@edx/frontend-platform/i18n';
import { Dropdown, Form, Icon, Image } from '@openedx/paragon';
import { Check } from '@openedx/paragon/icons';

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
  /** Learners earned the slot's badge in this curriculum: the picker is read-only, with a note. */
  locked?: boolean;
}

/**
 * One curriculum badge slot, as a Paragon dropdown listing each badge with its thumbnail.
 * Not required: "No badge" leaves the slot empty (spec R6).
 */
const BadgeSlotSelect = ({
  slot,
  value,
  badges,
  takenBadgeUuids,
  onChange,
  error,
  locked = false,
}: BadgeSlotSelectProps) => {
  const intl = useIntl();
  const slotLabel = intl.formatMessage(slotMessages[slot].label);
  const baseId = `curriculum-badge-slot-${slot}`;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const ruleId = `${baseId}-rule`;
  const lockedId = `${baseId}-locked`;
  const errorId = `${baseId}-error`;
  const noBadge = intl.formatMessage(messages.noBadgeOption);
  const selected = badges.find((badge) => badge.uuid === value);
  const describedBy = [ruleId, locked && lockedId, error && errorId].filter(Boolean).join(' ');

  const renderItem = (uuid: string, title: string, imageUrl?: string | null) => {
    const isSelected = uuid === value;
    return (
      <Dropdown.Item
        key={uuid || 'none'}
        eventKey={uuid}
        active={isSelected}
        aria-current={isSelected || undefined}
        disabled={!!uuid && takenBadgeUuids.includes(uuid)}
        className="d-flex align-items-center"
        title={title}
      >
        {imageUrl
          ? <Image src={imageUrl} alt="" className="curriculum-management-slot-option-image mr-2" />
          : uuid && <span className="curriculum-management-slot-option-image mr-2" aria-hidden="true" />}
        <span className="flex-grow-1 text-truncate curriculum-management-min-width-0">{title}</span>
        {isSelected && <Icon src={Check} size="sm" className="ml-2 flex-shrink-0" />}
      </Dropdown.Item>
    );
  };

  return (
    <Form.Group controlId={baseId} isInvalid={!!error}>
      <Form.Label id={labelId}>{intl.formatMessage(messages.slotSelectLabel, { slot: slotLabel })}</Form.Label>
      <Dropdown
        className="curriculum-management-slot-dropdown"
        onSelect={(eventKey: string | null) => onChange(eventKey ?? '')}
      >
        <Dropdown.Toggle
          id={baseId}
          as="button"
          type="button"
          // Label first, then the chosen value, so screen readers announce "Complete badge, Road ready".
          // The value span, not the toggle itself: the toggle has a <label for>, which would replace its own text.
          aria-labelledby={`${labelId} ${valueId}`}
          aria-describedby={describedBy}
          aria-invalid={!!error || undefined}
          disabled={locked}
          className={`form-control d-flex align-items-center text-left${error ? ' is-invalid' : ''}`}
          title={selected?.title}
          data-value={value}
        >
          {selected?.imageUrl && (
            <Image src={selected.imageUrl} alt="" className="curriculum-management-slot-option-image mr-2" />
          )}
          <span id={valueId} className="flex-grow-1 text-truncate curriculum-management-min-width-0">
            {selected ? selected.title : noBadge}
          </span>
        </Dropdown.Toggle>
        <Dropdown.Menu className="w-100 curriculum-management-slot-menu">
          {renderItem('', noBadge)}
          {badges.map((badge) => renderItem(badge.uuid, badge.title, badge.imageUrl))}
        </Dropdown.Menu>
      </Dropdown>
      <Form.Text id={ruleId}>{intl.formatMessage(slotMessages[slot].rule)}</Form.Text>
      {locked && <Form.Text id={lockedId}>{intl.formatMessage(messages.slotLocked)}</Form.Text>}
      {error && <Form.Control.Feedback id={errorId} type="invalid" hasIcon={false}>{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

export default BadgeSlotSelect;
