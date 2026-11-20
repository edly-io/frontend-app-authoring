import React, { useState, useCallback } from 'react';
import {
  Badge,
  Button,
  OverlayTrigger,
  Pagination,
  SearchField,
  Spinner,
  Stack,
  Tooltip,
  useToggle,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useCancelProgramInvite, useProgramEnrollments } from '../data/apiHooks';
import { downloadProgramMembersCsv } from '../data/api';
import AddLearnerModal from './AddLearnerModal';
import BulkEnrollModal from './BulkEnrollModal';

const messages = defineMessages({
  sectionTitle: { id: 'programs.enrollment.title', defaultMessage: 'Learner Enrollment' },
  sectionSubtitle: { id: 'programs.enrollment.subtitle', defaultMessage: 'Enroll learners into this program' },
  enrollLearnerBtn: { id: 'programs.enrollment.add-btn', defaultMessage: 'Enroll Learner' },
  bulkEnrollBtn: { id: 'programs.enrollment.bulk-btn', defaultMessage: 'Bulk enroll' },
  invited: { id: 'programs.enrollment.invited', defaultMessage: 'Invited' },
  enrolled: { id: 'programs.enrollment.enrolled', defaultMessage: 'Enrolled' },
  invitedCount: { id: 'programs.enrollment.invited-count', defaultMessage: '{count} invited' },
  cancelInvite: { id: 'programs.enrollment.cancel-invite', defaultMessage: 'Cancel invite' },
  cancelError: { id: 'programs.enrollment.cancel-error', defaultMessage: 'Could not cancel the invite.' },
  downloadCsv: { id: 'programs.enrollment.download-csv', defaultMessage: 'Download CSV' },
  downloadError: { id: 'programs.enrollment.download-error', defaultMessage: 'Could not download the CSV.' },
  searchPlaceholder: { id: 'programs.enrollment.search', defaultMessage: 'Search learners and invites...' },
  loading: { id: 'programs.enrollment.loading', defaultMessage: 'Loading enrolled learners...' },
  emptyEnrollment: { id: 'programs.enrollment.empty', defaultMessage: 'No learners enrolled yet. Click \'+ Enroll Learner\' to begin.' },
  noResults: { id: 'programs.enrollment.no-results', defaultMessage: 'No enrolled learners match your search.' },
  paginationLabel: { id: 'programs.enrollment.pagination', defaultMessage: 'Enrolled learner list pagination' },
  paidEnrollAdminOnly: {
    id: 'programs.enrollment.paid-admin-only',
    defaultMessage: 'This is a paid program. Only Rwaq admins can enroll learners into it.',
  },
  subscriptionEnrollNote: {
    id: 'programs.enrollment.subscription-note',
    defaultMessage: 'Learners join this program through their Rwaq subscription.',
  },
});

interface EnrollmentTabProps {
  programId: string;
  /** False for a paid program when the user is not a superadmin. */
  canEnroll?: boolean;
  /** True when the program's pricing category is is_part_of_subscription. Nobody enrolls learners into it here. */
  isSubscriptionProgram?: boolean;
  isPaid?: boolean;
}

const EnrollmentTab: React.FC<EnrollmentTabProps> = ({
  programId, canEnroll = true, isSubscriptionProgram = false, isPaid = false,
}) => {
  const intl = useIntl();
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [isBulkOpen, openBulk, closeBulk] = useToggle(false);
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [cancelError, setCancelError] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cancelInvite = useCancelProgramInvite();

  const { data, isLoading, isFetching } = useProgramEnrollments(
    programId,
    { page: enrolledPage, search: enrolledSearch },
  );

  const enrolledIds = data?.results.filter((l) => l.status !== 'invited').map((l) => l.id) ?? [];

  const handleSearch = useCallback((q: string) => {
    setEnrolledSearch(q);
    setEnrolledPage(1);
  }, []);

  const download = async () => {
    setDownloadError(false);
    setDownloading(true);
    try {
      const blob = await downloadProgramMembersCsv(programId, enrolledSearch);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'program-learners.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        {isSubscriptionProgram && (
          // Disabled but kept, so it can say why: a disabled button takes no hover or focus,
          // so it is only marked disabled and ignores clicks.
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="subscription-enroll-tooltip">
                {intl.formatMessage(messages.subscriptionEnrollNote)}
              </Tooltip>
            )}
          >
            <Button
              variant="outline-primary"
              iconBefore={Add}
              size="sm"
              className="disabled"
              aria-disabled="true"
              onClick={(event: React.MouseEvent) => event.preventDefault()}
            >
              {intl.formatMessage(messages.enrollLearnerBtn)}
            </Button>
          </OverlayTrigger>
        )}
        {!isSubscriptionProgram && (canEnroll ? (
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
        ))}
      </div>

      {!isSubscriptionProgram && canEnroll && (
        <Button variant="outline-primary" size="sm" className="mb-3" onClick={openBulk}>
          {intl.formatMessage(messages.bulkEnrollBtn)}
        </Button>
      )}
      {isSubscriptionProgram && (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="subscription-bulk-tooltip">{intl.formatMessage(messages.subscriptionEnrollNote)}</Tooltip>}
        >
          <Button variant="outline-primary" size="sm" className="disabled mb-3" aria-disabled="true">
            {intl.formatMessage(messages.bulkEnrollBtn)}
          </Button>
        </OverlayTrigger>
      )}

      <div className="mb-3">
        <SearchField
          onSubmit={handleSearch}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
          value={enrolledSearch}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
        />
      </div>
      {data && !enrolledSearch && <p className="small">{intl.formatMessage(messages.invitedCount, { count: data.invitedCount })}</p>}
      {cancelError && <p role="alert">{intl.formatMessage(messages.cancelError)}</p>}
      {downloadError && <p role="alert">{intl.formatMessage(messages.downloadError)}</p>}
      <Button variant="outline-primary" size="sm" disabled={downloading} onClick={download}>
        {intl.formatMessage(messages.downloadCsv)}
      </Button>

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
              <p className="mb-0 font-weight-bold">{learner.name || learner.email}</p>
              <Stack direction="horizontal" gap={1} className="flex-wrap mt-1">
                <Badge variant="light">{learner.email}</Badge>
                <Badge variant="light">{intl.formatMessage(learner.status === 'invited' ? messages.invited : messages.enrolled)}</Badge>
              </Stack>
            </div>
            {learner.status === 'invited' && learner.inviteId !== undefined && canEnroll && (
              <Button
                variant="outline-primary"
                size="sm"
                disabled={cancelInvite.isPending && cancelInvite.variables?.inviteId === learner.inviteId}
                aria-label={`${intl.formatMessage(messages.cancelInvite)}: ${learner.email}`}
                onClick={() => {
                  setCancelError(false);
                  const options = { onError: () => setCancelError(true) };
                  cancelInvite.mutate({ programId, inviteId: learner.inviteId! }, options);
                }}
              >
                {intl.formatMessage(messages.cancelInvite)}
              </Button>
            )}
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
      />
      <BulkEnrollModal isOpen={isBulkOpen} onClose={closeBulk} programId={programId} isPaid={isPaid} />
    </div>
  );
};

export default EnrollmentTab;
