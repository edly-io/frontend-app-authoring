import React, { useState, useCallback } from 'react';
import {
  Button,
  ButtonGroup,
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
import { AuditLogTable, toRoleBadges, UserIdentity } from '@edly-io/frontend-component-fbr';
import { useProgramEnrollments, useUnenrollLearner } from '../data/apiHooks';
import { getInitials } from '../feedback-tab/dashboard/feedbackDashboardUtils';
import DeleteModal from '../../generic/delete-modal/DeleteModal';
import AddLearnerModal from './AddLearnerModal';
import EnrollBatchModal from './EnrollBatchModal';

const messages = defineMessages({
  listTab: { id: 'programs.enrollment.tab.list', defaultMessage: 'List' },
  auditLogTab: { id: 'programs.enrollment.tab.audit-log', defaultMessage: 'Audit Log' },
  sectionTitle: { id: 'programs.enrollment.title', defaultMessage: 'Learner Enrollment' },
  sectionSubtitle: { id: 'programs.enrollment.subtitle', defaultMessage: 'Enroll learners into this program' },
  enrollLearnerBtn: { id: 'programs.enrollment.add-btn', defaultMessage: 'Enroll Learner' },
  enrollBatchBtn: { id: 'programs.enrollment.batch-btn', defaultMessage: 'Enroll Batch' },
  searchPlaceholder: { id: 'programs.enrollment.search', defaultMessage: 'Search enrolled learners...' },
  loading: { id: 'programs.enrollment.loading', defaultMessage: 'Loading enrolled learners...' },
  emptyEnrollment: { id: 'programs.enrollment.empty', defaultMessage: 'No learners enrolled yet. Click \'+ Enroll Learner\' to begin.' },
  noResults: { id: 'programs.enrollment.no-results', defaultMessage: 'No enrolled learners match your search.' },
  paginationLabel: { id: 'programs.enrollment.pagination', defaultMessage: 'Enrolled learner list pagination' },
  unenrollBtn: { id: 'programs.enrollment.unenroll-btn', defaultMessage: 'Unenroll' },
  confirmUnenrollTitle: { id: 'programs.enrollment.confirm-unenroll.title', defaultMessage: 'Unenroll Learner?' },
  confirmUnenrollDesc: {
    id: 'programs.enrollment.confirm-unenroll.desc',
    defaultMessage: 'This learner will be unenrolled from the program and all its courses. This action cannot be reverted.',
  },
  confirmUnenrollWarning: {
    id: 'programs.enrollment.confirm-unenroll.warning',
    defaultMessage: 'All enrollment data will be lost.',
  },
  confirmUnenrollBtn: { id: 'programs.enrollment.confirm-unenroll.btn', defaultMessage: 'Unenroll' },
});

interface EnrollmentTabProps {
  programId: string;
  canManage?: boolean;
  hasStarted?: boolean;
}

const EnrollmentTab: React.FC<EnrollmentTabProps> = ({ programId, canManage = true, hasStarted = false }) => {
  const intl = useIntl();
  const [isModalOpen, openModal, closeModal] = useToggle(false);
  const [isBatchModalOpen, openBatchModal, closeBatchModal] = useToggle(false);
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [confirmUnenrollUsername, setConfirmUnenrollUsername] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'audit-log'>('list');

  const { data, isLoading, isFetching } = useProgramEnrollments(
    programId,
    { page: enrolledPage, search: enrolledSearch },
  );
  const unenrollLearner = useUnenrollLearner();

  const confirmLearner = data?.results.find((l) => l.username === confirmUnenrollUsername);

  const handleSearch = useCallback((q: string) => {
    setEnrolledSearch(q);
    setEnrolledPage(1);
  }, []);

  return (
    <div className="mt-4">
      <div className="program-page-header mb-4">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages.sectionTitle)}</h3>
          <p className="text-muted small mb-0">{intl.formatMessage(messages.sectionSubtitle)}</p>
        </div>
        <Stack direction="horizontal" gap={2} className="program-page-header__actions">
          {canManage && activeView === 'list' && (
            <>
              <Button
                variant="outline-primary"
                iconBefore={Add}
                size="sm"
                onClick={openBatchModal}
              >
                {intl.formatMessage(messages.enrollBatchBtn)}
              </Button>
              <Button
                variant="outline-primary"
                iconBefore={Add}
                size="sm"
                onClick={openModal}
              >
                {intl.formatMessage(messages.enrollLearnerBtn)}
              </Button>
            </>
          )}
          <ButtonGroup size="sm" className="program-view-toggle">
            <Button
              variant={activeView === 'list' ? 'primary' : 'outline-primary'}
              size="sm"
              aria-pressed={activeView === 'list'}
              onClick={() => setActiveView('list')}
            >
              {intl.formatMessage(messages.listTab)}
            </Button>
            <Button
              variant={activeView === 'audit-log' ? 'primary' : 'outline-primary'}
              size="sm"
              aria-pressed={activeView === 'audit-log'}
              onClick={() => setActiveView('audit-log')}
            >
              {intl.formatMessage(messages.auditLogTab)}
            </Button>
          </ButtonGroup>
        </Stack>
      </div>

      {activeView === 'audit-log' && (
        <AuditLogTable
          appLabel="fbr_programs"
          models={['enrollment']}
          programKey={programId}
        />
      )}

      {activeView === 'list' && (
      <>
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
              className="program-member-row d-flex align-items-center py-3"
            >
              <span className="program-member-row__number mr-3 font-weight-bold text-muted">
                {(enrolledPage - 1) * 5 + index + 1}
              </span>
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
              {canManage && (
                hasStarted ? (
                  <OverlayTrigger
                    trigger={['hover', 'focus']}
                    placement="top"
                    overlay={(
                      <Tooltip id={`unenroll-disabled-${learner.id}`}>
                        Learners cannot be unenrolled after a program has started.
                      </Tooltip>
                  )}
                  >
                    <span>
                      <Button variant="outline-danger" size="sm" disabled style={{ pointerEvents: 'none' }}>
                        {intl.formatMessage(messages.unenrollBtn)}
                      </Button>
                    </span>
                  </OverlayTrigger>
                ) : (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setConfirmUnenrollUsername(learner.username)}
                    disabled={confirmUnenrollUsername !== null}
                  >
                    {intl.formatMessage(messages.unenrollBtn)}
                  </Button>
                )
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
      </>
      )}

      {canManage && (
        <>
          <AddLearnerModal
            isOpen={isModalOpen}
            onClose={closeModal}
            programId={programId}
          />

          <EnrollBatchModal
            isOpen={isBatchModalOpen}
            onClose={closeBatchModal}
            programId={programId}
          />

          <DeleteModal
            isOpen={!!confirmUnenrollUsername}
            close={() => setConfirmUnenrollUsername(null)}
            title={intl.formatMessage(messages.confirmUnenrollTitle)}
            description={(
              <>
                <strong>{confirmLearner?.name ?? confirmUnenrollUsername}</strong>
                <br />
                {intl.formatMessage(messages.confirmUnenrollDesc)}
                {' '}
                <strong>{intl.formatMessage(messages.confirmUnenrollWarning)}</strong>
              </>
            )}
            btnLabel={intl.formatMessage(messages.confirmUnenrollBtn)}
            onDeleteSubmit={async () => {
              await unenrollLearner.mutateAsync({ programId, username: confirmUnenrollUsername! });
              setConfirmUnenrollUsername(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default EnrollmentTab;
