import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  OverlayTrigger,
  Tooltip,
  useToggle,
} from '@openedx/paragon';
import { Tag as TagIcon } from '@openedx/paragon/icons';

import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';

import CourseTagsModal from './CourseTagsModal';
import { useCourseTagsStatus } from './data/apiHooks';
import messages from './messages';

/**
 * Course outline header button that opens the course tags dialog. Shown when the `uber_course_tags.enabled` flag is
 * on and the user has write access to the course. Also shown when the status fails to load for a reason other than
 * a 403 or a 404 (see `useCourseTagsStatus`), so the dialog can report the problem.
 */
const CourseTagsButton = () => {
  const intl = useIntl();
  const { courseId } = useCourseAuthoringContext();
  const { enabled, canAssign } = useCourseTagsStatus(courseId);
  const [isOpen, open, close] = useToggle(false);

  if (!enabled || !canAssign) {
    return null;
  }
  return (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={
          <Tooltip id="course-tags-button-tooltip">
            {intl.formatMessage(messages.buttonTooltip)}
          </Tooltip>
        }
      >
        <Button iconBefore={TagIcon} onClick={open} variant="outline-primary">
          {intl.formatMessage(messages.button)}
        </Button>
      </OverlayTrigger>
      {/* Mounted only while open, so the course's tags are fetched only when needed. */}
      {isOpen && <CourseTagsModal courseId={courseId} onClose={close} />}
    </>
  );
};

export default CourseTagsButton;
