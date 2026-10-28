import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  OverlayTrigger,
  Stack,
  Tooltip,
} from '@openedx/paragon';
import {
  Add as IconAdd,
  FindInPage,
  InfoOutline,
} from '@openedx/paragon/icons';

import { CourseCategoriesButton } from '@src/course-categories';
import { OutlinePageErrors, XBlockActions } from '@src/data/types';
import { PublishHistoryButton } from '@src/publish-history';

import { useOutlineSidebarContext } from '../outline-sidebar/OutlineSidebarContext';

import messages from './messages';

export interface HeaderActionsProps {
  courseActions: XBlockActions;
  headerNavigationsActions: {
    handleNewSection: () => void;
    handleReIndex: () => void;
    handleExpandAll: () => void;
    lmsLink: string;
  };
  isReIndexShow: boolean;
  isDisabledReindexButton: boolean;
  errors?: OutlinePageErrors;
}

const HeaderActions = ({
  courseActions,
  headerNavigationsActions,
  isReIndexShow,
  isDisabledReindexButton,
  errors,
}: HeaderActionsProps) => {
  const intl = useIntl();

  const { clearSelection, open, setCurrentPageKey } = useOutlineSidebarContext();
  const { handleReIndex, lmsLink } = headerNavigationsActions;

  const handleCourseInfoClick = () => {
    clearSelection();
    setCurrentPageKey('info');
    open();
  };

  return (
    <Stack direction="horizontal" gap={3}>
      <OverlayTrigger
        placement="bottom"
        overlay={
          <Tooltip id={intl.formatMessage(messages.courseInfoButtonTooltip)}>
            {intl.formatMessage(messages.courseInfoButtonTooltip)}
          </Tooltip>
        }
      >
        <Button
          iconBefore={InfoOutline}
          onClick={handleCourseInfoClick}
          variant="outline-primary"
        >
          {intl.formatMessage(messages.courseInfoButton)}
        </Button>
      </OverlayTrigger>
      <CourseCategoriesButton />
      <PublishHistoryButton />
      {isReIndexShow && (
        <OverlayTrigger
          placement="bottom"
          overlay={!isDisabledReindexButton ?
            (
              <Tooltip id={intl.formatMessage(messages.reindexButtonTooltip)}>
                {intl.formatMessage(messages.reindexButtonTooltip)}
              </Tooltip>
            ) :
            <></>}
        >
          <Button
            onClick={handleReIndex}
            data-testid="course-reindex"
            variant="outline-primary"
            disabled={isDisabledReindexButton}
          >
            {intl.formatMessage(messages.reindexButton)}
          </Button>
        </OverlayTrigger>
      )}
      {courseActions.childAddable && (
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip id={intl.formatMessage(messages.newSectionButtonTooltip)}>
              {intl.formatMessage(messages.newSectionButtonTooltip)}
            </Tooltip>
          }
        >
          <Button
            iconBefore={IconAdd}
            onClick={() => setCurrentPageKey('add')}
            disabled={!(errors?.outlineIndexApi === undefined || errors?.outlineIndexApi === null)}
            variant="outline-primary"
          >
            {intl.formatMessage(messages.addButton)}
          </Button>
        </OverlayTrigger>
      )}
      <OverlayTrigger
        placement="bottom"
        overlay={
          <Tooltip id={intl.formatMessage(messages.viewLiveButtonTooltip)}>
            {intl.formatMessage(messages.viewLiveButtonTooltip)}
          </Tooltip>
        }
      >
        <Button
          iconBefore={FindInPage}
          href={lmsLink}
          target="_blank"
          variant="outline-primary"
        >
          {intl.formatMessage(messages.viewLiveButton)}
        </Button>
      </OverlayTrigger>
    </Stack>
  );
};

export default HeaderActions;
