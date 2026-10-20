import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  ModalDialog,
  Tab,
  Tabs,
} from '@openedx/paragon';

import AssignCategoriesTab from './AssignCategoriesTab';
import ManageCategoriesTab from './ManageCategoriesTab';
import messages from './messages';
import './CourseCategories.scss';

interface CourseCategoriesModalProps {
  courseId: string;
  /** Global staff: show the Manage Categories tab. */
  canManage: boolean;
  onClose: () => void;
}

const CourseCategoriesModal = ({ courseId, canManage, onClose }: CourseCategoriesModalProps) => {
  const intl = useIntl();
  const assignTab = <AssignCategoriesTab courseId={courseId} />;
  return (
    <ModalDialog
      title={intl.formatMessage(messages.modalTitle)}
      isOpen
      onClose={onClose}
      size="lg"
      isFullscreenOnMobile
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.modalTitle)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        {canManage ?
          (
            <Tabs id="course-categories-tabs" variant="tabs" defaultActiveKey="assign" className="mb-3" mountOnEnter>
              <Tab eventKey="assign" title={intl.formatMessage(messages.assignTab)}>
                {assignTab}
              </Tab>
              <Tab eventKey="manage" title={intl.formatMessage(messages.manageTab)}>
                <ManageCategoriesTab />
              </Tab>
            </Tabs>
          ) :
          assignTab}
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">{intl.formatMessage(messages.close)}</ModalDialog.CloseButton>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default CourseCategoriesModal;
