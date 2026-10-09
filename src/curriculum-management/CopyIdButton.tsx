import { useIntl } from '@edx/frontend-platform/i18n';
import { Icon, IconButtonWithTooltip } from '@openedx/paragon';
import { ContentCopy } from '@openedx/paragon/icons';

import { useToastContext } from '../generic/toast-context';
import messages from './messages';

const COPY_MESSAGES = {
  badge: { copy: messages.copyId, copied: messages.idCopied, failed: messages.copyIdFailed },
  curriculum: {
    copy: messages.copyCurriculumId,
    copied: messages.curriculumIdCopied,
    failed: messages.copyCurriculumIdFailed,
  },
};

/** `navigator.clipboard` only exists on secure origins; plain-http Studio (local dev) falls back to execCommand. */
const copyText = async (value: string) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }
  // select() moves focus to the textarea; give it back to the button afterwards for keyboard users.
  const previousFocus = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  let copied = false;
  try {
    textarea.select();
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
    previousFocus?.focus();
  }
  if (!copied) {
    throw new Error('copy failed');
  }
};

const CopyIdButton = ({ value, entity }: { value: string; entity: keyof typeof COPY_MESSAGES; }) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const copy = COPY_MESSAGES[entity];
  return (
    <IconButtonWithTooltip
      size="sm"
      src={ContentCopy}
      iconAs={Icon}
      alt={intl.formatMessage(copy.copy)}
      tooltipContent={intl.formatMessage(copy.copy)}
      onClick={async () => {
        try {
          await copyText(value);
          showToast(intl.formatMessage(copy.copied));
        } catch {
          // Permission denied, or the browser refused both copy paths.
          showToast(intl.formatMessage(copy.failed));
        }
      }}
    />
  );
};

export default CopyIdButton;
