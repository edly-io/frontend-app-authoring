import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Alert } from '@openedx/paragon';

import alertErrorMessages from '../alert-error/messages';

interface Props extends React.ComponentPropsWithoutRef<typeof Alert> {
  title?: string;
  description?: string | React.ReactNode;
}

const AlertMessage: React.FC<Props> = ({
  title, description, closeLabel, ...props
}) => {
  const intl = useIntl();
  return (
    // Paragon's own "Dismiss" label is not translated here, so use Studio's translated one.
    <Alert closeLabel={closeLabel ?? intl.formatMessage(alertErrorMessages.dismissLabel)} {...props}>
      <Alert.Heading>{title}</Alert.Heading>
      <span>{description}</span>
    </Alert>
  );
};

export default AlertMessage;
