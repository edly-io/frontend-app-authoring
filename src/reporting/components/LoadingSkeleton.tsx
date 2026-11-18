import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

const LoadingSkeleton = () => {
  const intl = useIntl();
  return (
    <div className="reporting-skeleton" role="status" aria-label={intl.formatMessage(messages.loading)}>
      {Array.from({ length: 6 }, (_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="reporting-skeleton__row" />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
