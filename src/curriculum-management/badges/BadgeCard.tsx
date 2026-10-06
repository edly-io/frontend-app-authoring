import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Badge as Chip,
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
  EmojiEvents,
} from '@openedx/paragon/icons';

import DeleteModal from '../../generic/delete-modal/DeleteModal';
import AlertMessage from '../../generic/alert-message';
import { useToastContext } from '../../generic/toast-context';
import { CURRICULUM_MANAGEMENT_PATH } from '../constants';
import { useDeleteBadge } from '../data/apiHooks';
import type { Badge, CourseRef, SlotKey } from '../types';
import { kindMessages, slotMessages } from '../utils';
import messages from '../messages';
import CopyIdButton from './CopyIdButton';

interface BadgeCardProps {
  badge: Badge;
  defaultExpanded: boolean;
  onEdit: () => void;
}

const BadgeCard = ({ badge, defaultExpanded, onEdit }: BadgeCardProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDeleteOpen, openDelete, closeDelete] = useToggle(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteBadge = useDeleteBadge();
  const isCourseBadge = badge.kind === 'course';
  const isLinked = badge.linkedCurriculums.length > 0;
  const linkLabel = (link: { title: string; slot: SlotKey; }) =>
    intl.formatMessage(messages.linkedChip, {
      curriculum: link.title,
      slot: intl.formatMessage(slotMessages[link.slot].label),
    });
  const courseName = (course: CourseRef) => course.displayName ?? course.courseId;

  let deleteDescription: React.ReactNode;
  if (isCourseBadge && badge.courses.length > 0) {
    deleteDescription = (
      <>
        <p className="mb-1">
          {intl.formatMessage(messages.deleteBadgeCoursesWarning, { count: badge.courses.length })}
        </p>
        <ul className="mb-0">
          {badge.courses.map((course) => <li key={course.courseId}>{courseName(course)}</li>)}
        </ul>
      </>
    );
  } else if (isLinked) {
    deleteDescription = (
      <>
        <p className="mb-1">
          {intl.formatMessage(messages.deleteBadgeLinkedWarning, { count: badge.linkedCurriculums.length })}
        </p>
        <ul className="mb-0">
          {badge.linkedCurriculums.map((link) => <li key={`${link.uuid}-${link.slot}`}>{linkLabel(link)}</li>)}
        </ul>
      </>
    );
  }

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteBadge.mutateAsync(badge.uuid);
      closeDelete();
      showToast(intl.formatMessage(messages.badgeDeleted));
    } catch (error) {
      closeDelete();
      const response = (error as AxiosError<{ award_count?: number; }>).response;
      setDeleteError(
        response?.status === 409
          ? intl.formatMessage(messages.deleteBadgeAwardedError, { count: response.data?.award_count ?? 0 })
          : intl.formatMessage(messages.genericError),
      );
    }
  };

  return (
    <div className="configuration-card" data-testid="badge-card">
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
          {badge.imageUrl
            ? (
              <Image
                src={badge.imageUrl}
                alt={badge.title}
                className="curriculum-management-badge-image curriculum-management-badge-thumb mr-3"
              />
            )
            : (
              <div
                className="curriculum-management-badge-placeholder curriculum-management-badge-thumb mr-3"
                aria-hidden
              >
                <Icon src={EmojiEvents} />
              </div>
            )}
          <div className="configuration-card-header__title curriculum-management-min-width-0 curriculum-management-header-baseline">
            <h3 className="text-break">{badge.title}</h3>
            <span className="x-small text-gray-500 text-break">
              {intl.formatMessage(messages.itemId, { id: badge.uuid })}
            </span>
          </div>
          <Stack gap={2} direction="horizontal" className="ml-3 curriculum-management-header-baseline">
            <Chip variant="light" className="configuration-card-header__badge">
              <span className="small">{intl.formatMessage(kindMessages[badge.kind].label)}</span>
            </Chip>
            <Chip className="configuration-card-header__badge">
              <span className="small">
                {isCourseBadge
                  ? intl.formatMessage(messages.courseCount, { count: badge.courses.length })
                  : intl.formatMessage(messages.linkedCountChip, { count: badge.linkedCurriculums.length })}
              </span>
            </Chip>
          </Stack>
        </Button>
        <ActionRow className="ml-auto d-flex">
          {/* Outside the toggle: a button can't nest inside another button. */}
          <CopyIdButton value={badge.uuid} />
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
          {badge.description && <p className="small text-gray-700">{badge.description}</p>}
          {isCourseBadge ?
            (
              <>
                <h4 className="h5">{intl.formatMessage(messages.badgeCoursesHeading)}</h4>
                {badge.courses.length > 0 ?
                  (
                    <ul className="list-unstyled mb-0">
                      {badge.courses.map((course) => (
                        <li key={course.courseId} className="mb-1">
                          <span className="font-weight-bold mr-2">{courseName(course)}</span>
                          <span className="x-small text-gray-500">{course.courseId}</span>
                          {!course.exists && (
                            <Chip variant="danger" className="ml-2">{intl.formatMessage(messages.courseNotFound)}</Chip>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) :
                  (
                    <span className="x-small text-gray-500 font-italic">
                      {intl.formatMessage(messages.badgeCoursesEmpty)}
                    </span>
                  )}
              </>
            ) :
            (
              <>
                <h4 className="h5">{intl.formatMessage(messages.linkedTo)}</h4>
                {isLinked ?
                  (
                    <div className="d-flex flex-wrap">
                      {badge.linkedCurriculums.map((link) => (
                        <Chip
                          key={`${link.uuid}-${link.slot}`}
                          as={Link}
                          to={CURRICULUM_MANAGEMENT_PATH}
                          variant="light"
                          className="mr-2 mb-2"
                        >
                          {linkLabel(link)}
                        </Chip>
                      ))}
                    </div>
                  ) :
                  <span className="x-small text-gray-500 font-italic">{intl.formatMessage(messages.notLinked)}</span>}
              </>
            )}
        </div>
      )}
      <DeleteModal
        category={intl.formatMessage(messages.deleteBadgeCategory)}
        isOpen={isDeleteOpen}
        close={closeDelete}
        onDeleteSubmit={handleDelete}
        description={deleteDescription}
      />
    </div>
  );
};

export default BadgeCard;
