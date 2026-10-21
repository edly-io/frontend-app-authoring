import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  OverlayTrigger,
  Tooltip,
  useToggle,
} from '@openedx/paragon';
import { Category as CategoryIcon } from '@openedx/paragon/icons';

import { useCourseAuthoringContext } from '@src/CourseAuthoringContext';

import CourseCategoriesModal from './CourseCategoriesModal';
import { useCourseCategoriesStatus } from './data/apiHooks';
import messages from './messages';

/**
 * Course outline header button that opens the course categories dialog. Hidden unless the
 * `uber_course_categories.enabled` flag is on and the user has write access to the course.
 */
const CourseCategoriesButton = () => {
  const intl = useIntl();
  const { courseId, courseDetails } = useCourseAuthoringContext();
  const { enabled, canAssign, canManage } = useCourseCategoriesStatus(courseId);
  const [isOpen, open, close] = useToggle(false);

  if (!enabled || !canAssign) {
    return null;
  }
  return (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={
          <Tooltip id="course-categories-button-tooltip">
            {intl.formatMessage(messages.buttonTooltip)}
          </Tooltip>
        }
      >
        <Button iconBefore={CategoryIcon} onClick={open} variant="outline-primary">
          {intl.formatMessage(messages.button)}
        </Button>
      </OverlayTrigger>
      {/* Mounted only while open, so the category lists are fetched only when needed. */}
      {isOpen && (
        <CourseCategoriesModal
          courseId={courseId}
          courseName={courseDetails?.name}
          canManage={canManage}
          onClose={close}
        />
      )}
    </>
  );
};

export default CourseCategoriesButton;
