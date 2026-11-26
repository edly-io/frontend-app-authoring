import { useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Alert,
  Chip,
  ModalDialog,
  Spinner,
} from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';

import {
  useAssignTag,
  useCourseTags,
  useUnassignTag,
} from './data/apiHooks';
import messages from './messages';
import TagTypeahead from './TagTypeahead';
import {
  MAX_TAGS_PER_COURSE,
  getAssignErrorMessage,
  getUnassignErrorMessage,
} from './utils';
import './CourseTags.scss';

interface CourseTagsBodyProps {
  courseId: string;
}

/** The tag field, the "n/100" counter, and the course's tags as removable chips. */
const CourseTagsBody = ({ courseId }: CourseTagsBodyProps) => {
  const intl = useIntl();
  const tagsQuery = useCourseTags(courseId);
  const assign = useAssignTag(courseId);
  const unassign = useUnassignTag(courseId);
  const inputRef = useRef<HTMLInputElement>(null);
  /** The tag being removed: once its chip is gone, focus goes back to the field instead of falling to <body>. */
  const removing = useRef<number>();

  useEffect(() => {
    if (removing.current !== undefined && tagsQuery.data?.every(({ id }) => id !== removing.current)) {
      removing.current = undefined;
      inputRef.current?.focus();
    }
  }, [tagsQuery.data]);

  if (tagsQuery.isPending) {
    return <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />;
  }
  if (tagsQuery.isError) {
    return <Alert variant="danger">{intl.formatMessage(messages.loadError)}</Alert>;
  }

  const tags = tagsQuery.data;
  const atLimit = tags.length >= MAX_TAGS_PER_COURSE;
  let error: string | undefined;
  if (assign.isError) {
    error = getAssignErrorMessage(assign.error, intl);
  } else if (unassign.isError) {
    error = getUnassignErrorMessage(unassign.error, intl);
  }

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <TagTypeahead
        courseId={courseId}
        assigned={tags}
        disabled={atLimit}
        hint={atLimit ? intl.formatMessage(messages.limitReached, { max: MAX_TAGS_PER_COURSE }) : undefined}
        inputRef={inputRef}
        onPick={(name) => {
          unassign.reset();
          assign.mutate(name);
        }}
      />
      <div className="d-flex justify-content-end mb-2">
        {/* A plain span can't carry an aria-label, so screen readers get the sentence and skip the "n/100". */}
        <span className="small text-gray-700">
          <span aria-hidden="true">
            {intl.formatMessage(messages.counter, { count: tags.length, max: MAX_TAGS_PER_COURSE })}
          </span>
          <span className="sr-only">
            {intl.formatMessage(messages.counterAria, { count: tags.length, max: MAX_TAGS_PER_COURSE })}
          </span>
        </span>
      </div>
      {tags.length === 0 ?
        <p className="small text-gray-700 mb-0">{intl.formatMessage(messages.empty)}</p> :
        (
          <ul
            className="course-tags-list list-unstyled d-flex flex-wrap mb-0"
            aria-label={intl.formatMessage(messages.assignedLabel)}
          >
            {tags.map(({ id, name }) => (
              <li key={id} className="course-tags-chip-item mr-2 mb-2">
                <Chip
                  iconAfter={Close}
                  iconAfterAlt={intl.formatMessage(messages.removeAria, { name })}
                  onIconAfterClick={() => {
                    removing.current = id;
                    assign.reset();
                    unassign.mutate(id, {
                      onError: () => {
                        if (removing.current === id) {
                          removing.current = undefined;
                        }
                      },
                    });
                  }}
                >
                  <span className="text-truncate" title={name}>{name}</span>
                </Chip>
              </li>
            ))}
          </ul>
        )}
    </>
  );
};

interface CourseTagsModalProps {
  courseId: string;
  onClose: () => void;
}

const CourseTagsModal = ({ courseId, onClose }: CourseTagsModalProps) => {
  const intl = useIntl();
  return (
    <ModalDialog
      title={intl.formatMessage(messages.modalTitle)}
      isOpen
      onClose={onClose}
      className="course-tags-modal"
      size="lg"
      isFullscreenOnMobile
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.modalTitle)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        <CourseTagsBody courseId={courseId} />
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">{intl.formatMessage(messages.close)}</ModalDialog.CloseButton>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default CourseTagsModal;
