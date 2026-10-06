import { useIntl } from '@edx/frontend-platform/i18n';
import { Icon, IconButtonWithTooltip } from '@openedx/paragon';
import { ContentCopy } from '@openedx/paragon/icons';

import { useToastContext } from '../../generic/toast-context';
import messages from '../messages';

const CopyIdButton = ({ value }: { value: string; }) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  return (
    <IconButtonWithTooltip
      size="sm"
      src={ContentCopy}
      iconAs={Icon}
      alt={intl.formatMessage(messages.copyId)}
      tooltipContent={intl.formatMessage(messages.copyId)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          showToast(intl.formatMessage(messages.idCopied));
        } catch {
          // Permission denied, insecure context, or no Clipboard API.
          showToast(intl.formatMessage(messages.copyIdFailed));
        }
      }}
    />
  );
};

export default CopyIdButton;
