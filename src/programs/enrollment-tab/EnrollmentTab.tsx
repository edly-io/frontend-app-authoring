import React, { useState, useCallback } from 'react';
import {
  Badge,
  Button,
  Pagination,
  SearchField,
  Spinner,
  Stack,
  useToggle,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useProgramEnrollments } from '../data/apiHooks';
import AddLearnerModal from './AddLearnerModal';

const messages = defineMessages({
  sectionTitle: { id: 'programs.enrollment.title', defaultMessage: 'Learner Enrollment' },
  sectionSubtitle: { id: 'programs.enrollment.subtitle', defaultMessage: 'Enroll learners into this program' },
  enrollLearnerBtn: { id: 'programs.enrollment.add-btn', defaultMessage: 'Enroll Learner' },
  searchPlaceholder: { id: 'programs.enrollment.search', defaultMessage: 'Search enrolled learners...' },
  loading: { id: 'programs.enrollment.loading', defaultMessage: 'Loading enrolled learners...' },
  emptyEnrollment: { id: 'programs.enrollment.empty', defaultMessage: 'No learners enrolled yet. Click \'+ Enroll Learner\' to begin.' },
  noResults: { id: 'programs.enrollment.no-results', defaultMessage: 'No enrolled learners match your search.' },
  paginationLabel: { id: 'programs.enrollment.pagination', defaultMessage: 'Enrolled learner list pagination' },
  paidEnrollAdminOnly: {
    id: 'programs.enrollment.paid-admin-only',
    defaultMessage: 'This is a paid program. Only Rwaq admins can enroll learners into it.',
  },
});

interface EnrollmentTabProps {
  programId: string;
  /** False for a paid program when the user is not a superadmin. */
  canEnroll?: boolean;
  /** True when the program's pricing category is is_part_of_subscription. */
  isSubscriptionProgram?: boolean;
}

const EnrollmentTab: React.FC<EnrollmentTabProps> = ({
  programId, canEnroll = true, isSubscriptionProgram = false,
}) => {
  const intl = useIntl();
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledPage, setEnrolledPage] = useState(1);

  const { data, isLoading, isFetching } = useProgramEnrollments(
    programId,
    { page: enrolledPage, search: enrolledSearch },
  );

  const enrolledIds = data?.results.map((l) => l.id) ?? [];

  const handleSearch = useCallback((q: string) => {
    setEnrolledSearch(q);
    setEnrolledPage(1);
  }, []);

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        {canEnroll ? (
          <Button
            variant="outline-primary"
            iconBefore={Add}
            size="sm"
            onClick={openModal}
          >
            {intl.formatMessage(messages.enrollLearnerBtn)}
          </Button>
        ) : (
          <p className="text-muted small mb-0">{intl.formatMessage(messages.paidEnrollAdminOnly)}</p>
        )}
      </div>

      <div className="mb-3">
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
          value={enrolledSearch}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loading)} />
        </div>
      )}

      {!isLoading && (!data || data.results.length === 0) && !isFetching && (
        <p className="text-muted text-center py-4">
          {enrolledSearch
            ? intl.formatMessage(messages.noResults)
            : intl.formatMessage(messages.emptyEnrollment)}
        </p>
      )}

      <div style={{ opacity: isFetching && !isLoading ? 0.4 : 1, transition: 'opacity 0.15s' }}>
        {!isLoading && data?.results.map((learner, index) => (
          <div
            key={learner.id}
            className="d-flex align-items-center py-3"
            style={{ borderBottom: '1px solid #dee2e6' }}
          >
            <span
              className="mr-3 font-weight-bold text-muted"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '0.8em',
              }}
            >
              {(enrolledPage - 1) * 5 + index + 1}
            </span>
            <div className="flex-grow-1">
              <p className="mb-0 font-weight-bold">{learner.name}</p>
              <Stack direction="horizontal" gap={1} className="flex-wrap mt-1">
                <Badge variant="light">{learner.email}</Badge>
              </Stack>
            </div>
          </div>
        ))}
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
          currentPage={enrolledPage}
          onPageSelect={(page: number) => setEnrolledPage(page)}
          className="mt-3"
        />
      )}

      <AddLearnerModal
        isOpen={isModalOpen}
        onClose={closeModal}
        programId={programId}
        alreadyEnrolledIds={enrolledIds}
        isSubscriptionProgram={isSubscriptionProgram}
      />
    </div>
  );
};

export default EnrollmentTab;
