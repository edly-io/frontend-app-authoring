import { useState } from 'react';
import type { AxiosError } from 'axios';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Badge,
  Button,
  Icon,
  IconButtonWithTooltip,
  Image,
  Stack,
  useToggle,
} from '@openedx/paragon';
import {
  ArrowDropDown,
  ArrowRight,
  DeleteOutline,
  EditOutline,
} from '@openedx/paragon/icons';

import DeleteModal from '../../generic/delete-modal/DeleteModal';
import AlertMessage from '../../generic/alert-message';
import { useToastContext } from '../../generic/toast-context';
import { SLOT_KEYS } from '../constants';
import { useDeleteCurriculum } from '../data/apiHooks';
import type { CourseRef, Curriculum } from '../types';
import { slotMessages } from '../utils';
import messages from '../messages';

interface CurriculumCardProps {
  curriculum: Curriculum;
  defaultExpanded: boolean;
  onEdit: () => void;
}

const CourseLine = ({ course }: { course: CourseRef; }) => {
  const intl = useIntl();
  return (
    <>
      <span className="font-weight-bold mr-2">{course.displayName ?? course.courseId}</span>
      <span className="x-small text-gray-500">{course.courseId}</span>
      {!course.exists && <Badge variant="danger" className="ml-2">{intl.formatMessage(messages.courseNotFound)}</Badge>}
    </>
  );
};

const CurriculumCard = ({ curriculum, defaultExpanded, onEdit }: CurriculumCardProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDeleteOpen, openDelete, closeDelete] = useToggle(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteCurriculum = useDeleteCurriculum();
  const filledSlots = SLOT_KEYS.filter((slot) => curriculum.badges[slot]).length;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteCurriculum.mutateAsync(curriculum.uuid);
      closeDelete();
      showToast(intl.formatMessage(messages.curriculumDeleted));
    } catch (error) {
      closeDelete();
      const response = (error as AxiosError<{ assignment_count?: number; }>).response;
      setDeleteError(
        response?.status === 409
          ? intl.formatMessage(messages.deleteCurriculumAssignedError, { count: response.data?.assignment_count ?? 0 })
          : intl.formatMessage(messages.genericError),
      );
    }
  };

  return (
    <div className="configuration-card" data-testid="curriculum-card">
      {deleteError && (
        <AlertMessage
          variant="danger"
          title={intl.formatMessage(messages.deleteErrorTitle)}
          description={deleteError}
        />
      )}
      <div className="configuration-card-header">
        <Button
          variant="tertiary"
          className="configuration-card-header__button curriculum-management-min-width-0"
          iconBefore={isExpanded ? ArrowDropDown : ArrowRight}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
        >
          <div className="configuration-card-header__title curriculum-management-min-width-0 curriculum-management-header-baseline">
            <h3 className="text-break">{curriculum.title}</h3>
            <span className="x-small text-gray-500">
              {intl.formatMessage(messages.itemId, { id: curriculum.uuid })}
            </span>
          </div>
          <Stack gap={2} direction="horizontal" className="ml-3 curriculum-management-header-baseline">
            <Badge className="configuration-card-header__badge">
              <span className="small">
                {intl.formatMessage(messages.courseCount, { count: curriculum.courses.length })}
              </span>
            </Badge>
            <Badge className="configuration-card-header__badge">
              <span className="small">
                {intl.formatMessage(messages.delayChip, { days: curriculum.knowledgeCheckDelayDays })}
              </span>
            </Badge>
            <Badge className="configuration-card-header__badge">
              <span className="small">{intl.formatMessage(messages.badgeSlotsChip, { count: filledSlots })}</span>
            </Badge>
          </Stack>
        </Button>
        <ActionRow className="ml-auto d-flex">
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.edit)}
            alt={intl.formatMessage(messages.edit)}
            src={EditOutline}
            iconAs={Icon}
            onClick={onEdit}
          />
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.delete)}
            alt={intl.formatMessage(messages.delete)}
            src={DeleteOutline}
            iconAs={Icon}
            onClick={openDelete}
          />
        </ActionRow>
      </div>
      {isExpanded && (
        <div className="configuration-card-content pt-3">
          {curriculum.description && <p className="small text-gray-700">{curriculum.description}</p>}
          <h4 className="h5">{intl.formatMessage(messages.coursesHeading)}</h4>
          <ol className="pl-4">
            {curriculum.courses.map((course) => (
              <li key={course.courseId} className="mb-2">
                <CourseLine course={course} />
              </li>
            ))}
          </ol>
          <h4 className="h5">{intl.formatMessage(messages.knowledgeCheckHeading)}</h4>
          <p>
            <CourseLine course={curriculum.knowledgeCheck} />
            <Badge variant="light" className="ml-2">
              {intl.formatMessage(messages.opensAfter, { days: curriculum.knowledgeCheckDelayDays })}
            </Badge>
          </p>
          <h4 className="h5">{intl.formatMessage(messages.badgesHeading)}</h4>
          {/* Read-only: slots are filled from the default badges when the curriculum is created (spec R6). */}
          <ul className="list-unstyled mb-0">
            {SLOT_KEYS.map((slot) => {
              const badge = curriculum.badges[slot];
              return (
                <li key={slot} className="mb-1 d-flex align-items-center">
                  {badge?.imageUrl && (
                    <Image
                      src={badge.imageUrl}
                      alt={badge.title}
                      className="curriculum-management-badge-image curriculum-management-slot-image mr-2"
                    />
                  )}
                  <span className={badge ? undefined : 'text-gray-500 font-italic'}>
                    {intl.formatMessage(messages.slotEntry, {
                      slot: intl.formatMessage(slotMessages[slot].label),
                      badge: badge?.title ?? intl.formatMessage(messages.slotEmpty),
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <DeleteModal
        category={intl.formatMessage(messages.deleteCurriculumCategory)}
        isOpen={isDeleteOpen}
        close={closeDelete}
        onDeleteSubmit={handleDelete}
      />
    </div>
  );
};

export default CurriculumCard;
