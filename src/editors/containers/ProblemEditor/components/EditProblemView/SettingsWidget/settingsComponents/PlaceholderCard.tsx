import React from 'react';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';
import SettingsOption from '@src/editors/containers/ProblemEditor/components/EditProblemView/SettingsWidget/SettingsOption';
import messages from '@src/editors/containers/ProblemEditor/components/EditProblemView/SettingsWidget/messages';

interface Props {
  placeholder: string;
  updateSettings: (settings: { placeholder: string; }) => void;
}

// Uber: text shown in the empty dropdown or text field, saved as the input's placeholder attribute.
const PlaceholderCard = ({ placeholder, updateSettings }: Props) => {
  const intl = useIntl();

  return (
    <SettingsOption
      title={intl.formatMessage(messages.placeholderSettingsTitle)}
      summary={placeholder || intl.formatMessage(messages.placeholderNoneSummary)}
      none={!placeholder}
      // SettingsOption is JS with defaultProps, which TypeScript can't see: same values.
      className=""
      extraSections={[]}
      hasExpandableTextArea={false}
    >
      <div className="spacedMessage">
        <span>
          <FormattedMessage {...messages.placeholderSettingText} />
        </span>
      </div>
      <Form.Group>
        <Form.Control
          value={placeholder}
          onChange={(e) => updateSettings({ placeholder: e.target.value })}
          floatingLabel={intl.formatMessage(messages.placeholderInputLabel)}
        />
      </Form.Group>
    </SettingsOption>
  );
};

export default PlaceholderCard;
