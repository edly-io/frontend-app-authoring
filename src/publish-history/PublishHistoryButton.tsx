import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  OverlayTrigger,
  Tooltip,
} from '@openedx/paragon';
import { History } from '@openedx/paragon/icons';
import { useNavigate } from 'react-router-dom';

import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';

import { usePublishHistoryStatus } from './data/apiHooks';
import messages from './messages';

/**
 * Course outline header button that opens the publish history page. Hidden unless the
 * `uber_publish_history.enabled` flag is on and the user has write access to the course.
 */
const PublishHistoryButton = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { courseId } = useCourseAuthoringContext();
  const { enabled, canView } = usePublishHistoryStatus(courseId);

  if (!enabled || !canView) {
    return null;
  }
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={
        <Tooltip id="publish-history-button-tooltip">
          {intl.formatMessage(messages.buttonTooltip)}
        </Tooltip>
      }
    >
      <Button
        iconBefore={History}
        onClick={() => navigate(`/course/${courseId}/publish_history`)}
        variant="outline-primary"
      >
        {intl.formatMessage(messages.button)}
      </Button>
    </OverlayTrigger>
  );
};

export default PublishHistoryButton;
