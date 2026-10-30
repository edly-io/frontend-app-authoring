import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';
import {
  ActionRow,
  Alert,
  Badge,
  Button,
  Collapsible,
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
import { useDeleteDeepLink } from '../data/apiHooks';
import type {
  DeepLink,
  DeepLinkRef,
  DeepLinksConfig,
  LaunchTarget,
  PickedPath,
} from '../types';
import messages from '../messages';
import CopyIdButton from '../CopyIdButton';
import { CardDetails, CourseLine, DetailRow, EmptyValue } from '../CardDetails';
import TestLinkForm from './TestLinkForm';

/** Destination -> its label. Raw API target values are never shown. */
export const targetMessages: Record<LaunchTarget, MessageDescriptor> = {
  home: messages.targetHome,
  course: messages.targetCourse,
  optional: messages.targetOptional,
  path: messages.targetLearningPath,
};

interface DeepLinkCardProps {
  link: DeepLink;
  config: DeepLinksConfig;
  defaultExpanded?: boolean;
  onEdit: () => void;
}

/** A learning path or group the link names: its title (or ID when gone) with the ID below, flagged when missing. */
const RefLine = ({ item, notFound, badge }: { item: DeepLinkRef; notFound: MessageDescriptor; badge?: string; }) => {
  const intl = useIntl();
  return (
    <span className="d-block text-break">
      <span className="font-weight-bold">{item.title ?? item.slug}</span>
      {badge && <Badge variant="light" className="ml-2">{badge}</Badge>}
      {!item.exists && <Badge variant="danger" className="ml-2">{intl.formatMessage(notFound)}</Badge>}
      <span className="d-block x-small text-gray-700">{item.slug}</span>
    </span>
  );
};

/** One saved deep link: the app link to copy, what it carries, and a signed test link for it. */
const DeepLinkCard = ({ link, config, defaultExpanded = false, onEdit }: DeepLinkCardProps) => {
  const intl = useIntl();
  const { showToast } = useToastContext();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDeleteOpen, openDelete, closeDelete] = useToggle(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteLink = useDeleteDeepLink();

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteLink.mutateAsync(link.uuid);
      closeDelete();
      showToast(intl.formatMessage(messages.deepLinkDeleted));
    } catch {
      closeDelete();
      setDeleteError(intl.formatMessage(messages.genericError));
    }
  };

  // What the test link form needs, in the shape of the builder's picks.
  const course = link.course
    ? { id: link.course.courseId, displayName: link.course.displayName ?? link.course.courseId }
    : null;
  const assignedPaths: PickedPath[] = link.paths.map((path) => ({ id: path.slug, title: path.title ?? path.slug }));
  const path = link.target === 'path' ? (assignedPaths[0] ?? null) : null;

  return (
    <div className="configuration-card" data-testid="deep-link-card">
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
            <h3 className="text-break">{link.title}</h3>
            <div className="d-flex flex-wrap align-items-center curriculum-management-meta">
              <Badge variant="primary">
                <span className="small">{intl.formatMessage(targetMessages[link.target])}</span>
              </Badge>
              {link.paths.length > 0 && (
                <Badge variant="light">
                  <span className="small">{intl.formatMessage(messages.pathCount, { count: link.paths.length })}</span>
                </Badge>
              )}
              {link.groups.length > 0 && (
                <Badge variant="light">
                  <span className="small">
                    {intl.formatMessage(messages.groupCount, { count: link.groups.length })}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </Button>
        <ActionRow className="ml-auto d-flex">
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.edit)}
            alt={intl.formatMessage(messages.editAria, { title: link.title })}
            src={EditOutline}
            iconAs={Icon}
            onClick={onEdit}
          />
          <IconButtonWithTooltip
            tooltipContent={intl.formatMessage(messages.delete)}
            alt={intl.formatMessage(messages.deleteAria, { title: link.title })}
            src={DeleteOutline}
            iconAs={Icon}
            onClick={openDelete}
          />
        </ActionRow>
      </div>
      <div className="d-flex align-items-center border rounded px-3 py-2 bg-light-200 curriculum-management-app-link">
        <code className="flex-grow-1 text-break curriculum-management-min-width-0" data-testid="app-link">
          {link.appLink}
        </code>
        <CopyIdButton value={link.appLink} entity="link" />
      </div>
      {isExpanded && (
        <CardDetails description={link.description} title={link.title}>
          <DetailRow label={intl.formatMessage(messages.cardDestination)}>
            {intl.formatMessage(targetMessages[link.target])}
          </DetailRow>
          <DetailRow label={intl.formatMessage(messages.cardCourse)}>
            {link.course
              ? <CourseLine course={link.course} />
              : <EmptyValue>{intl.formatMessage(messages.cardNone)}</EmptyValue>}
          </DetailRow>
          <DetailRow label={intl.formatMessage(messages.cardPaths)}>
            {link.paths.length === 0
              ? <EmptyValue>{intl.formatMessage(messages.cardNone)}</EmptyValue>
              : (
                <ol className="mb-0 pl-3">
                  {link.paths.map((item, index) => (
                    <li key={item.slug} className="mb-2">
                      <RefLine
                        item={item}
                        notFound={messages.pathNotFound}
                        badge={link.target === 'path' && index === 0
                          ? intl.formatMessage(messages.cardOpensFirst)
                          : undefined}
                      />
                    </li>
                  ))}
                </ol>
              )}
          </DetailRow>
          <DetailRow label={intl.formatMessage(messages.cardGroups)}>
            {link.groups.length === 0
              ? <EmptyValue>{intl.formatMessage(messages.cardGroupsKept)}</EmptyValue>
              : (
                <ul className="list-unstyled mb-0">
                  {link.groups.map((item) => (
                    <li key={item.slug} className="mb-2">
                      <RefLine item={item} notFound={messages.groupNotFound} />
                    </li>
                  ))}
                </ul>
              )}
          </DetailRow>
        </CardDetails>
      )}
      {isExpanded && (
        <div className="curriculum-management-test-link">
          <Collapsible
            styling="card-lg"
            title={<h4 className="h6 mb-0">{intl.formatMessage(messages.testLinkHeading)}</h4>}
            data-testid="test-link-section"
          >
            <p className="small text-gray-700 mb-3">
              {intl.formatMessage(messages.testLinkHelp, { ttl: config.defaultTtlSeconds })}
            </p>
            {config.testLinks.enabled
              ? (
                <TestLinkForm
                  target={link.target}
                  course={course}
                  path={path}
                  assignedPaths={assignedPaths}
                  groupSlugs={link.groups.map((group) => group.slug)}
                />
              )
              : (
                <Alert variant="warning" className="mb-0">
                  {intl.formatMessage(
                    config.testLinks.unavailableReason === 'other_scheme'
                      ? messages.testLinkUnavailableScheme
                      : messages.testLinkUnavailableOff,
                  )}
                </Alert>
              )}
          </Collapsible>
        </div>
      )}
      <DeleteModal
        category={intl.formatMessage(messages.deleteDeepLinkCategory)}
        isOpen={isDeleteOpen}
        close={closeDelete}
        onDeleteSubmit={handleDelete}
        description={intl.formatMessage(messages.deleteDeepLinkHelp)}
      />
    </div>
  );
};

export default DeepLinkCard;
