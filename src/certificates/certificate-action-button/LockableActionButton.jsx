import classNames from 'classnames';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useIntl } from '@edx/frontend-platform/i18n';
import { IconButtonWithTooltip } from '@openedx/paragon';

import { getCanEditCertificate } from '../data/selectors';
import messages from '../messages';

const LockableActionButton = ({
  className, tooltipContent, onClick, ...props
}) => {
  const intl = useIntl();
  const canEdit = useSelector(getCanEditCertificate);

  return (
    <IconButtonWithTooltip
      {...props}
      className={classNames(className, { 'certificate-action--disabled': !canEdit })}
      aria-disabled={!canEdit}
      tooltipContent={canEdit ? tooltipContent : <div>{intl.formatMessage(messages.activeCertificateEditHint)}</div>}
      onClick={canEdit ? onClick : undefined}
    />
  );
};

LockableActionButton.defaultProps = {
  className: undefined,
  onClick: undefined,
};

LockableActionButton.propTypes = {
  className: PropTypes.string,
  tooltipContent: PropTypes.node.isRequired,
  onClick: PropTypes.func,
};

export default LockableActionButton;
