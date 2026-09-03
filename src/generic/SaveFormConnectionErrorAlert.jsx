import React from 'react';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { Alert } from '@openedx/paragon';

import messages from '../messages';

const SaveFormConnectionErrorAlert = () => {
  const intl = useIntl();
  return (
    <Alert variant="danger" data-testid="connectionErrorAlert">
      <FormattedMessage
        id="authoring.alert.save.error.connection"
        defaultMessage="We encountered a technical error when applying changes. This might be a temporary issue, so please try again in a few minutes. If the problem persists, please email us at {supportLink} for help."
        values={{
          supportLink: (
            <Alert.Link href="mailto:support@edly.io">
              {intl.formatMessage(messages.supportText)}
            </Alert.Link>
          ),
        }}
      />
    </Alert>
  );
};

export default SaveFormConnectionErrorAlert;
