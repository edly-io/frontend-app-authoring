import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  ActionRow,
  Alert,
  Badge,
  Button,
  ModalDialog,
  Pagination,
  SearchField,
  Spinner,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useInstructors, useAddInstructorToCourse } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'programs.instructors.modal.title', defaultMessage: 'Add Instructor to Course' },
  searchPlaceholder: { id: 'programs.instructors.modal.search', defaultMessage: 'Search instructors...' },
  addBtn: { id: 'programs.instructors.modal.add', defaultMessage: 'Add' },
  addingBtn: { id: 'programs.instructors.modal.adding', defaultMessage: 'Adding...' },
  addedBadge: { id: 'programs.instructors.modal.added', defaultMessage: 'Added' },
  cancelBtn: { id: 'programs.instructors.modal.cancel', defaultMessage: 'Cancel' },
  noResults: { id: 'programs.instructors.modal.no-results', defaultMessage: 'No instructors match your search.' },
  loading: { id: 'programs.instructors.modal.loading', defaultMessage: 'Loading instructors...' },
  addError: { id: 'programs.instructors.modal.add-error', defaultMessage: 'Failed to add instructor. Please try again.' },
  paginationLabel: { id: 'programs.instructors.modal.pagination', defaultMessage: 'Instructor list pagination' },
});

interface AddInstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  alreadyAddedUsernames: string[];
  programId: string;
}

const AddInstructorModal: React.FC<AddInstructorModalProps> = ({
  isOpen, onClose, courseId, courseName, alreadyAddedUsernames, programId,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useInstructors(
    { page: currentPage, search: searchQuery, programKey: programId },
    isOpen,
  );
  const { mutateAsync: addInstructor } = useAddInstructorToCourse();

  useEffect(() => {
    listRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const handleAdd = async (username: string) => {
    setAddingId(username);
    setAddError(null);
    try {
      await addInstructor({ courseId, username });
    } catch (err: any) {
      setAddError(
        err?.response?.data?.detail ?? intl.formatMessage(messages.addError),
      );
    } finally {
      setAddingId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setAddError(null);
    onClose();
  };

  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      hasCloseButton
      isFullscreenOnMobile
      isOverflowVisible={false}
    >
      <ModalDialog.Header style={{ zIndex: 9 }}>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
        <p className="small text-muted mt-1 mb-3">{courseName}</p>
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
          value={searchQuery}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
      </ModalDialog.Header>

      <ModalDialog.Body>
        {addError && (
          <Alert variant="danger" className="mb-3">{addError}</Alert>
        )}
        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
          </div>
        )}
        {!isLoading && (!data || data.results.length === 0) && !isFetching && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.noResults)}</p>
        )}
        <div ref={listRef} />
        <div style={{ opacity: isFetching && !isLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
          {!isLoading && data?.results.map((instructor) => {
            const isAdded = alreadyAddedUsernames.includes(instructor.username);
            const isAdding = addingId === instructor.username;
            return (
              <div
                key={instructor.id}
                className="d-flex justify-content-between align-items-center py-3"
                style={{ borderBottom: '1px solid #dee2e6' }}
              >
                <div>
                  <p className="mb-1 font-weight-bold">{instructor.name}</p>
                  <p className="mb-0 small text-muted">{instructor.email}</p>
                </div>
                {isAdded ? (
                  <Badge variant="success">{intl.formatMessage(messages.addedBadge)}</Badge>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAdd(instructor.username)}
                    disabled={isAdding || !!addingId}
                  >
                    {isAdding ? intl.formatMessage(messages.addingBtn) : intl.formatMessage(messages.addBtn)}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {isFetching && !isLoading && (
          <div className="d-flex justify-content-center py-2">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
          </div>
        )}
        {data && data.numPages > 1 && (
          <Pagination
            paginationLabel={intl.formatMessage(messages.paginationLabel)}
            pageCount={data.numPages}
            currentPage={currentPage}
            onPageSelect={(page: number) => setCurrentPage(page)}
            className="mt-3"
          />
        )}
      </ModalDialog.Body>

      <ModalDialog.Footer>
        <ActionRow>
          <ModalDialog.CloseButton variant="tertiary">
            {intl.formatMessage(messages.cancelBtn)}
          </ModalDialog.CloseButton>
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default AddInstructorModal;
