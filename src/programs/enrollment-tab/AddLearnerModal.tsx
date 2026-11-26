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
import { toRoleBadges, UserIdentity } from '@edly-io/frontend-component-fbr';
import { useLearners, useEnrollLearner, useEnrolledLearnerIds } from '../data/apiHooks';
import { getInitials } from '../feedback-tab/dashboard/feedbackDashboardUtils';

const messages = defineMessages({
  title: { id: 'programs.enrollment.modal.title', defaultMessage: 'Enroll Learner in Program' },
  subtitle: { id: 'programs.enrollment.modal.subtitle', defaultMessage: 'Select a learner to enroll in this program' },
  searchPlaceholder: { id: 'programs.enrollment.modal.search', defaultMessage: 'Search learners...' },
  enrollBtn: { id: 'programs.enrollment.modal.enroll', defaultMessage: 'Enroll' },
  enrollingBtn: { id: 'programs.enrollment.modal.enrolling', defaultMessage: 'Enrolling...' },
  enrolledBadge: { id: 'programs.enrollment.modal.enrolled', defaultMessage: 'Enrolled' },
  cancelBtn: { id: 'programs.enrollment.modal.cancel', defaultMessage: 'Cancel' },
  noResults: { id: 'programs.enrollment.modal.no-results', defaultMessage: 'No learners match your search.' },
  resultsCount: {
    id: 'programs.enrollment.modal.results-count',
    defaultMessage: '{count, plural, one {# learner found} other {# learners found}}',
  },
  enrolledStatus: { id: 'programs.enrollment.modal.enrolled-status', defaultMessage: '{name} enrolled in the program.' },
  loading: { id: 'programs.enrollment.modal.loading', defaultMessage: 'Loading learners...' },
  enrollError: { id: 'programs.enrollment.modal.enroll-error', defaultMessage: 'Failed to enroll learner. Please try again.' },
  paginationLabel: { id: 'programs.enrollment.modal.pagination', defaultMessage: 'Learner list pagination' },
});

interface AddLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
}

const AddLearnerModal: React.FC<AddLearnerModalProps> = ({
  isOpen, onClose, programId,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastEnrolledId, setLastEnrolledId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useLearners(
    { page: currentPage, search: searchQuery, programKey: programId },
    isOpen,
  );
  const { data: enrolledIdSet } = useEnrolledLearnerIds(programId, isOpen);
  const { mutateAsync: enrollLearner } = useEnrollLearner();

  useEffect(() => {
    listRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  useEffect(() => {
    if (lastEnrolledId && enrolledIdSet?.has(lastEnrolledId)) {
      document.getElementById(`enrolled-badge-${lastEnrolledId}`)?.focus();
      setLastEnrolledId(null);
    }
  }, [lastEnrolledId, enrolledIdSet]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const handleEnroll = async (learner: { id: string; username: string; name: string }) => {
    setEnrollingId(learner.username);
    setEnrollError(null);
    setStatusMessage('');
    try {
      await enrollLearner({ programId, username: learner.username });
      setStatusMessage(intl.formatMessage(messages.enrolledStatus, { name: learner.name }));
      setLastEnrolledId(learner.id);
    } catch (err: any) {
      setEnrollError(
        err?.response?.data?.detail ?? intl.formatMessage(messages.enrollError),
      );
    } finally {
      setEnrollingId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setEnrollError(null);
    setStatusMessage('');
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
        <div role="status" className="sr-only">{statusMessage}</div>
        {enrollError && (
          <Alert variant="danger" className="mb-3">{enrollError}</Alert>
        )}
        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
          </div>
        )}
        <div role="status">
          {!isLoading && (!data || data.results.length === 0) && !isFetching && (
            <p className="text-muted text-center py-4">{intl.formatMessage(messages.noResults)}</p>
          )}
          {!isLoading && !isFetching && !!data?.results.length && (
            <span className="sr-only">{intl.formatMessage(messages.resultsCount, { count: data.count })}</span>
          )}
        </div>
        <div ref={listRef} />
        <div style={{ opacity: isFetching && !isLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
          {!isLoading && data?.results.map((learner) => {
            const isEnrolled = enrolledIdSet?.has(learner.id) ?? false;
            const isEnrolling = enrollingId === learner.id;
            return (
              <div
                key={learner.id}
                className="program-member-row d-flex align-items-center py-3"
              >
                <div className="program-member-row__main flex-grow-1 d-flex flex-wrap align-items-center">
                  <div className="program-member-row__identity">
                    <UserIdentity
                      name={learner.name}
                      badges={toRoleBadges('trainee')}
                      size="compact"
                      avatarValue={getInitials(learner.name)}
                    />
                  </div>
                  <span className="program-member-row__email text-muted">{learner.email}</span>
                </div>
                {isEnrolled ? (
                  <Badge variant="success" id={`enrolled-badge-${learner.id}`} tabIndex={-1}>
                    {intl.formatMessage(messages.enrolledBadge)}
                  </Badge>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEnroll(learner)}
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
