import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  IconButton, IconButtonWithTooltip, OverlayTrigger, Tooltip,
} from '@openedx/paragon';

import messages from '../messages';

const CertificateActionButton = ({
  isDisabled, className, tooltipContent, alt, ...props
}) => {
  const intl = useIntl();

  if (!isDisabled) {
    return <IconButtonWithTooltip className={className} tooltipContent={tooltipContent} alt={alt} {...props} />;
  }

  return (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id="certificate-action-disabled-tooltip">
          {intl.formatMessage(messages.activeCertificateEditHint)}
        </Tooltip>
      )}
    >
      <span className={className} tabIndex={0} role="button" aria-disabled="true" aria-label={alt}>
        <IconButton {...props} alt={alt} aria-hidden="true" tabIndex={-1} disabled />
      </span>
    </OverlayTrigger>
  );
};

CertificateActionButton.defaultProps = {
  isDisabled: false,
  className: '',
};

CertificateActionButton.propTypes = {
  isDisabled: PropTypes.bool,
  className: PropTypes.string,
  tooltipContent: PropTypes.node.isRequired,
  alt: PropTypes.string.isRequired,
};

export default CertificateActionButton;
