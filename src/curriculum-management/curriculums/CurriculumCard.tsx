import { useState } from 'react';
import type { AxiosError } from 'axios';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Alert,
  Badge,
  Button,
  Icon,
  IconButtonWithTooltip,
  Image,
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
import { SLOT_KEYS } from '../constants';
import { useDeleteCurriculum } from '../data/apiHooks';
import type { Curriculum } from '../types';
import { slotMessages } from '../utils';
import messages from '../messages';
import CopyIdButton from '../CopyIdButton';
import { CardDetails, CourseLine, DetailRow, EmptyValue } from '../CardDetails';

interface CurriculumCardProps {
  curriculum: Curriculum;
  defaultExpanded?: boolean;
  onEdit: () => void;
}

const CurriculumCard = ({ curriculum, defaultExpanded = false, onEdit }: CurriculumCardProps) => {
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
            <h3 className="text-break">{curriculum.title}</h3>
            {/* The chips share the ID line so the title row keeps its full width; they wrap under it when narrow. */}
            <div className="d-flex flex-wrap align-items-center curriculum-management-meta">
              <span className="x-small text-gray-700 text-break">
                {intl.formatMessage(messages.itemId, { id: curriculum.uuid })}
              </span>
              <Badge variant="primary">
                <span className="small">
                  {intl.formatMessage(messages.courseCount, { count: curriculum.courses.length })}
                </span>
              </Badge>
              <Badge variant="primary">
                <span className="small">
                  {intl.formatMessage(messages.delayChip, { days: curriculum.knowledgeCheckDelayDays })}
                </span>
              </Badge>
              <Badge variant="primary">
                <span className="small">
                  {intl.formatMessage(messages.badgeSlotsChip, { count: filledSlots, total: SLOT_KEYS.length })}
                </span>
              </Badge>
            </div>
          </div>
        </Button>
        <ActionRow className="ml-auto d-flex">
          {/* Outside the toggle: a button can't nest inside another button. */}
          <CopyIdButton value={curriculum.uuid} entity="curriculum" />
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.edit)}
            alt={intl.formatMessage(messages.editAria, { title: curriculum.title })}
            src={EditOutline}
            iconAs={Icon}
            onClick={onEdit}
          />
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.delete)}
            alt={intl.formatMessage(messages.deleteAria, { title: curriculum.title })}
            src={DeleteOutline}
            iconAs={Icon}
            onClick={openDelete}
          />
        </ActionRow>
      </div>
      {isExpanded && (
        <CardDetails description={curriculum.description} title={curriculum.title}>
          <DetailRow label={intl.formatMessage(messages.coursesHeading)}>
            <ol className="mb-0 pl-3">
              {curriculum.courses.map((course) => (
                <li key={course.courseId} className="mb-2">
                  <CourseLine course={course} />
                </li>
              ))}
            </ol>
          </DetailRow>
          <DetailRow label={intl.formatMessage(messages.knowledgeCheckHeading)}>
            <CourseLine course={curriculum.knowledgeCheck} />
            <Badge variant="light" className="mt-1">
              {intl.formatMessage(messages.opensAfter, { days: curriculum.knowledgeCheckDelayDays })}
            </Badge>
            {/* Pass mark and attempts are hidden when the LMS doesn't send them; a missing time limit shows as 'No time limit'. */}
            <ul className="list-unstyled mb-0 mt-2 small text-gray-700">
              {curriculum.knowledgeCheckPassThreshold != null && (
                <li>
                  {intl.formatMessage(messages.passThresholdSummary, {
                    threshold: curriculum.knowledgeCheckPassThreshold,
                  })}
                </li>
              )}
              {curriculum.knowledgeCheckMaxAttempts != null && (
                <li>
                  {intl.formatMessage(messages.maxAttemptsSummary, { count: curriculum.knowledgeCheckMaxAttempts })}
                </li>
              )}
              <li>
                {curriculum.knowledgeCheckTimeLimit != null
                  ? intl.formatMessage(messages.timeLimitSummary, { minutes: curriculum.knowledgeCheckTimeLimit })
                  : intl.formatMessage(messages.noTimeLimit)}
              </li>
            </ul>
          </DetailRow>
          <DetailRow label={intl.formatMessage(messages.badgesHeading)}>
            {/* Read-only: the slots are picked on the curriculum form. */}
            <ul className="list-unstyled mb-0">
              {SLOT_KEYS.map((slot) => {
                const badge = curriculum.badges[slot];
                return (
                  <li key={slot} className="mb-1 d-flex align-items-center" data-testid={`slot-${slot}`}>
                    <span className="curriculum-management-slot-label text-gray-700 flex-shrink-0 mr-2">
                      {intl.formatMessage(slotMessages[slot].label)}
                    </span>
                    {badge?.imageUrl && (
                      <Image
                        src={badge.imageUrl}
                        alt={badge.title}
                        className="curriculum-management-badge-image curriculum-management-slot-image mr-2"
                      />
                    )}
                    <span className="text-break curriculum-management-min-width-0">
                      {badge ? badge.title : <EmptyValue>{intl.formatMessage(messages.slotEmpty)}</EmptyValue>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </DetailRow>
        </CardDetails>
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
