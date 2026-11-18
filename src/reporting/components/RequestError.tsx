import { Alert } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import { getErrorStatus } from '../../generic/queryErrors';
import messages from '../messages';

/**
 * The alert a failed reporting request shows. A 403 is final and says so; anything else reads as a
 * failure the reader can retry. Shared so a selector and a table never explain the same 403 differently.
 */
const RequestError = ({ error }: { error: unknown; }) => {
  const intl = useIntl();
  const forbidden = getErrorStatus(error) === 403;
  return (
    <Alert variant="danger">
      {intl.formatMessage(forbidden ? messages.forbidden : messages.error)}
    </Alert>
  );
};

export default RequestError;
