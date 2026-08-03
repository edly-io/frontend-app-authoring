import React, { useMemo, useState } from 'react';
import {
  ActionRow,
  Alert,
  Avatar,
  Badge,
  Button,
  ModalDialog,
  SearchField,
  Spinner,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { InstructorProfile } from '../../instructors/data/types';
import { useInstructors, useLinkInstructorToCourse } from '../../instructors/data/apiHooks';
import messages from './messages';

interface LinkInstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  alreadyLinkedIds: number[];
}

const InstructorRow: React.FC<{
  name: string;
  image?: string | null;
  isLinked: boolean;
  isLinking: boolean;
  onLink: () => void;
  intl: ReturnType<typeof useIntl>;
}> = ({
  name, image, isLinked, isLinking, onLink, intl,
}) => (
  <div
    className="d-flex justify-content-between align-items-center py-3"
    style={{ borderBottom: '1px solid #dee2e6' }}
  >
    <div className="d-flex align-items-center gap-2">
      <Avatar size="sm" src={image ?? undefined} alt={name} />
      <p className="mb-0 font-weight-bold">{name}</p>
    </div>
    {isLinked ? (
      <Badge variant="success">{intl.formatMessage(messages.modalAddedBadge)}</Badge>
    ) : (
      <Button variant="primary" size="sm" onClick={onLink} disabled={isLinking}>
        {isLinking ? intl.formatMessage(messages.modalAddingBtn) : intl.formatMessage(messages.modalAddBtn)}
      </Button>
    )}
  </div>
);

const LinkInstructorModal: React.FC<LinkInstructorModalProps> = ({
  isOpen, onClose, courseId, alreadyLinkedIds,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [linkError, setLinkError] = useState(false);
  const { data: instructors = [], isLoading } = useInstructors();
  const { mutateAsync: linkInstructor } = useLinkInstructorToCourse();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { return instructors; }
    return instructors.filter((i: InstructorProfile) => i.name.toLowerCase().includes(q));
  }, [instructors, searchQuery]);

  const handleLink = async (instructorId: number) => {
    setLinkingId(instructorId);
    setLinkError(false);
    try {
      await linkInstructor({ courseId, instructorId });
    } catch {
      setLinkError(true);
    } finally {
      setLinkingId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setLinkError(false);
    onClose();
  };

  return (
    <ModalDialog
      title={intl.formatMessage(messages.modalTitle)}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.modalTitle)}</ModalDialog.Title>
        <p className="small text-muted mt-1 mb-3">{intl.formatMessage(messages.modalSubtitle)}</p>
        <SearchField
          onSubmit={setSearchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          value={searchQuery}
          placeholder={intl.formatMessage(messages.modalSearchPlaceholder)}
        />
      </ModalDialog.Header>

      <ModalDialog.Body>
        {linkError && (
          <Alert variant="danger" className="mb-3">
            {intl.formatMessage(messages.modalAddError)}
          </Alert>
        )}
        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText="Loading" />
          </div>
        )}
        {!isLoading && instructors.length === 0 && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.modalEmpty)}</p>
        )}
        {!isLoading && instructors.length > 0 && filtered.length === 0 && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.modalNoResults)}</p>
        )}
        {!isLoading && filtered.map((instructor: InstructorProfile) => (
          <InstructorRow
            key={instructor.id}
            name={instructor.name}
            image={instructor.image}
            isLinked={alreadyLinkedIds.includes(instructor.id)}
            isLinking={linkingId === instructor.id}
            onLink={() => handleLink(instructor.id)}
            intl={intl}
          />
        ))}
      </ModalDialog.Body>

      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.modalCancelBtn)}
          </ModalDialog.CloseButton>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default LinkInstructorModal;
