import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Alert,
  Badge,
  Button,
  Icon,
  IconButtonWithTooltip,
  useToggle,
} from '@openedx/paragon';
import {
  ArrowDropDown,
  ArrowRight,
  DeleteOutline,
  EditOutline,
} from '@openedx/paragon/icons';

import DeleteModal from '../../generic/delete-modal/DeleteModal';
import { useToastContext } from '../../generic/toast-context';
import { useDeleteCourseGroup } from '../data/apiHooks';
import type { CourseGroup } from '../types';
import messages from '../messages';
import CopyIdButton from '../CopyIdButton';
import { CardDetails, CourseLine, DetailRow, EmptyValue } from '../CardDetails';

interface CourseGroupCardProps {
  group: CourseGroup;
  defaultExpanded?: boolean;
  onEdit: () => void;
}

const CourseGroupCard = ({ group, defaultExpanded = false, onEdit }: CourseGroupCardProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDeleteOpen, openDelete, closeDelete] = useToggle(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteGroup = useDeleteCourseGroup();

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteGroup.mutateAsync(group.slug);
      closeDelete();
      showToast(intl.formatMessage(messages.courseGroupDeleted));
    } catch {
      closeDelete();
      setDeleteError(intl.formatMessage(messages.genericError));
    }
  };

  return (
    <div className="configuration-card" data-testid="course-group-card">
      {deleteError && (
        <Alert
          variant="danger"
          className="curriculum-management-delete-alert"
          dismissible
          onClose={() => setDeleteError(null)}
        >
          {deleteError}
        </Alert>
      )}
      <div className="configuration-card-header">
        <Button
          variant="tertiary"
          className="configuration-card-header__button curriculum-management-min-width-0"
          iconBefore={isExpanded ? ArrowDropDown : ArrowRight}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
        >
          <div className="configuration-card-header__title curriculum-management-min-width-0">
            <h3 className="text-break">{group.title}</h3>
            <div className="d-flex flex-wrap align-items-center curriculum-management-meta">
              <span className="x-small text-gray-700 text-break">
                {intl.formatMessage(messages.groupId, { id: group.slug })}
              </span>
              <Badge variant="primary">
                <span className="small">
                  {intl.formatMessage(messages.courseCount, { count: group.courses.length })}
                </span>
              </Badge>
              <Badge variant="light">
                <span className="small">
                  {intl.formatMessage(messages.learnerCount, { count: group.learnerCount })}
                </span>
              </Badge>
            </div>
          </div>
        </Button>
        <ActionRow className="ml-auto d-flex">
          <CopyIdButton value={group.slug} entity="courseGroup" />
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.edit)}
            alt={intl.formatMessage(messages.editAria, { title: group.title })}
            src={EditOutline}
            iconAs={Icon}
            onClick={onEdit}
          />
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.delete)}
            alt={intl.formatMessage(messages.deleteAria, { title: group.title })}
            src={DeleteOutline}
            iconAs={Icon}
            onClick={openDelete}
          />
        </ActionRow>
      </div>
      {isExpanded && (
        <CardDetails description={group.description} title={group.title}>
          <DetailRow label={intl.formatMessage(messages.groupCoursesHeading)}>
            {group.courses.length === 0
              ? <EmptyValue>{intl.formatMessage(messages.groupCoursesEmpty)}</EmptyValue>
              : (
                <ol className="mb-0 pl-3">
                  {group.courses.map((course) => (
                    <li key={course.courseId} className="mb-2">
                      <CourseLine course={course} />
                    </li>
                  ))}
                </ol>
              )}
          </DetailRow>
        </CardDetails>
      )}
      <DeleteModal
        category={intl.formatMessage(messages.deleteCourseGroupCategory)}
        isOpen={isDeleteOpen}
        close={closeDelete}
        onDeleteSubmit={handleDelete}
        description={group.learnerCount > 0
          ? intl.formatMessage(messages.deleteCourseGroupWarning, { count: group.learnerCount })
          : undefined}
      />
    </div>
  );
};

export default CourseGroupCard;
