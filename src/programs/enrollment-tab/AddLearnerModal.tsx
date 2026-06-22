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
import { useLearners, useEnrollLearner } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'programs.enrollment.modal.title', defaultMessage: 'Enroll Learner in Program' },
  subtitle: { id: 'programs.enrollment.modal.subtitle', defaultMessage: 'Select a learner to enroll in this program' },
  searchPlaceholder: { id: 'programs.enrollment.modal.search', defaultMessage: 'Search learners...' },
  enrollBtn: { id: 'programs.enrollment.modal.enroll', defaultMessage: 'Enroll' },
  enrollingBtn: { id: 'programs.enrollment.modal.enrolling', defaultMessage: 'Enrolling...' },
  enrolledBadge: { id: 'programs.enrollment.modal.enrolled', defaultMessage: 'Enrolled' },
  cancelBtn: { id: 'programs.enrollment.modal.cancel', defaultMessage: 'Cancel' },
  noResults: { id: 'programs.enrollment.modal.no-results', defaultMessage: 'No learners match your search.' },
  loading: { id: 'programs.enrollment.modal.loading', defaultMessage: 'Loading learners...' },
  enrollError: { id: 'programs.enrollment.modal.enroll-error', defaultMessage: 'Failed to enroll learner. Please try again.' },
  paginationLabel: { id: 'programs.enrollment.modal.pagination', defaultMessage: 'Learner list pagination' },
});

interface AddLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  alreadyEnrolledIds: string[];
}

const AddLearnerModal: React.FC<AddLearnerModalProps> = ({
  isOpen, onClose, programId, alreadyEnrolledIds,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useLearners({ page: currentPage, search: searchQuery }, isOpen);
  const { mutateAsync: enrollLearner } = useEnrollLearner();

  useEffect(() => {
    listRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const handleEnroll = async (username: string) => {
    setEnrollingId(username);
    setEnrollError(false);
    try {
      await enrollLearner({ programId, username });
    } catch {
      setEnrollError(true);
    } finally {
      setEnrollingId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setEnrollError(false);
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
        <p className="small text-muted mt-1 mb-3">{intl.formatMessage(messages.subtitle)}</p>
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
          value={searchQuery}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
      </ModalDialog.Header>

      <ModalDialog.Body>
        {enrollError && (
          <Alert variant="danger" className="mb-3">
            {intl.formatMessage(messages.enrollError)}
          </Alert>
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
          {!isLoading && data?.results.map((learner) => {
            const isEnrolled = alreadyEnrolledIds.includes(learner.id);
            const isEnrolling = enrollingId === learner.id;
            return (
              <div
                key={learner.id}
                className="d-flex justify-content-between align-items-center py-3"
                style={{ borderBottom: '1px solid #dee2e6' }}
              >
                <div>
                  <p className="mb-1 font-weight-bold">{learner.name}</p>
                  <p className="mb-0 small text-muted">{learner.email}</p>
                </div>
                {isEnrolled ? (
                  <Badge variant="success">{intl.formatMessage(messages.enrolledBadge)}</Badge>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEnroll(learner.username)}
                    disabled={isEnrolling || !!enrollingId}
                  >
                    {isEnrolling ? intl.formatMessage(messages.enrollingBtn) : intl.formatMessage(messages.enrollBtn)}
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

export default AddLearnerModal;
