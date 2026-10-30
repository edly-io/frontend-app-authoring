import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge, Button, Form, Icon, OverlayTrigger, Spinner, Tooltip,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';
import { useUpdateAttendanceSettings } from './data/apiHooks';
import type { AttendanceSettings } from './data/types';
import messages from './messages';

interface AttendanceSettingRowProps {
  field: keyof AttendanceSettings;
  /** The stored value; `undefined` until settings (or the `/config/` echo of them) load. */
  savedValue: number | undefined;
  label: string;
  tip: string;
  unit: string;
  ariaLabel: string;
  max?: number;
}

/** One global attendance setting: a number field with Save shown only once it differs from the stored value. */
const AttendanceSettingRow = ({
  field, savedValue, label, tip, unit, ariaLabel, max,
}: AttendanceSettingRowProps) => {
  const intl = useIntl();
  const updateSettings = useUpdateAttendanceSettings();
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? savedValue ?? 0;
  const isChanged = savedValue !== undefined && value !== savedValue;

  const handleSave = () => updateSettings.mutate({ [field]: value }, { onSuccess: () => setDraft(null) });

  return (
    <div className="attendance-report__setting-row mb-2">
      <div className="attendance-report__setting-label">
        <span>{label}</span>
        <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={<Tooltip id={`tip-${field}`}>{tip}</Tooltip>}>
          <Button
            variant="link"
            size="inline"
            className="attendance-report__info-tip"
            aria-label={tip}
          >
            <Icon src={InfoOutline} className="attendance-report__info-icon" />
          </Button>
        </OverlayTrigger>
      </div>
      <div className="attendance-report__setting-field">
        <Form.Control
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            updateSettings.reset();
            setDraft(Number(e.target.value));
          }}
          className="attendance-report__setting-input"
          aria-label={ariaLabel}
          disabled={updateSettings.isPending}
        />
        <span>{unit}</span>
      </div>
      {isChanged && (
        <Button variant="outline-primary" size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? <Spinner animation="border" size="sm" /> : intl.formatMessage(messages.save)}
        </Button>
      )}
      {updateSettings.isSuccess && <Badge variant="success">{intl.formatMessage(messages.settingSaved)}</Badge>}
      {updateSettings.isError && <Badge variant="danger">{intl.formatMessage(messages.settingSaveError)}</Badge>}
    </div>
  );
};

export default AttendanceSettingRow;
