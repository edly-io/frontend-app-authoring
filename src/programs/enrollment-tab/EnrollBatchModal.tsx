import React, {
  useCallback, useEffect, useState,
} from 'react';
import {
  ActionRow,
  Alert,
  Badge,
  Button,
  Form,
  ModalDialog,
  Spinner,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useBatches, useBatchUsers, useEnrollLearner } from '../data/apiHooks';

const messages = defineMessages({
  title: { id: 'programs.enrollment.batch.title', defaultMessage: 'Enroll Batch' },
  subtitle: { id: 'programs.enrollment.batch.subtitle', defaultMessage: 'Select a batch to enroll all its learners into this program' },
  batchSelectLabel: { id: 'programs.enrollment.batch.select-label', defaultMessage: 'Select Batch' },
  batchSelectPlaceholder: { id: 'programs.enrollment.batch.select-placeholder', defaultMessage: '-- Select a batch --' },
  loadingBatches: { id: 'programs.enrollment.batch.loading-batches', defaultMessage: 'Loading batches...' },
  loadingUsers: { id: 'programs.enrollment.batch.loading-users', defaultMessage: 'Loading batch learners...' },
  enrolledBadge: { id: 'programs.enrollment.batch.enrolled', defaultMessage: 'Enrolled' },
  enrollAllBtn: { id: 'programs.enrollment.batch.enroll-all', defaultMessage: 'Enroll All' },
  enrollingAllBtn: { id: 'programs.enrollment.batch.enrolling-all', defaultMessage: 'Enrolling...' },
  enrolledAllSuccess: { id: 'programs.enrollment.batch.success', defaultMessage: 'All learners enrolled successfully.' },
  enrollError: { id: 'programs.enrollment.batch.error', defaultMessage: 'Some enrollments failed. Please try again.' },
  cancelBtn: { id: 'programs.enrollment.batch.cancel', defaultMessage: 'Cancel' },
  noBatchUsers: { id: 'programs.enrollment.batch.no-users', defaultMessage: 'No learners found in this batch.' },
  selectBatchPrompt: { id: 'programs.enrollment.batch.prompt', defaultMessage: 'Select a batch above to see its learners.' },
});

interface EnrollBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  alreadyEnrolledIds: string[];
}

const EnrollBatchModal: React.FC<EnrollBatchModalProps> = ({
  isOpen, onClose, programId, alreadyEnrolledIds,
}) => {
  const intl = useIntl();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isEnrollingAll, setIsEnrollingAll] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [enrollError, setEnrollError] = useState(false);

  const { data: batches, isLoading: isBatchesLoading } = useBatches(isOpen);
  const { data: batchUsers, isLoading: isUsersLoading } = useBatchUsers(selectedBatchId, !!selectedBatchId);
  const { mutateAsync: enrollLearner } = useEnrollLearner();

  useEffect(() => {
    if (!isOpen) {
      setSelectedBatchId('');
      setIsEnrollingAll(false);
      setEnrollSuccess(false);
      setEnrollError(false);
    }
  }, [isOpen]);

  const unenrolledUsers = batchUsers?.filter((u) => !alreadyEnrolledIds.includes(u.id)) ?? [];

  const handleEnrollAll = useCallback(async () => {
    setIsEnrollingAll(true);
    setEnrollError(false);
    setEnrollSuccess(false);
    let anyFailed = false;
    for (const user of unenrolledUsers) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await enrollLearner({ programId, username: user.username });
      } catch {
        anyFailed = true;
      }
    }
    setIsEnrollingAll(false);
    if (anyFailed) {
      setEnrollError(true);
    } else {
      setEnrollSuccess(true);
    }
  }, [unenrolledUsers, enrollLearner, programId]);

  const handleClose = () => {
    setSelectedBatchId('');
    setIsEnrollingAll(false);
    setEnrollSuccess(false);
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
        {isBatchesLoading ? (
          <div className="d-flex align-items-center py-2">
            <Spinner animation="border" size="sm" screenReaderText={intl.formatMessage(messages.loadingBatches)} />
            <span className="ml-2 small text-muted">{intl.formatMessage(messages.loadingBatches)}</span>
          </div>
        ) : (
          <Form.Group className="mb-0">
            <Form.Label>{intl.formatMessage(messages.batchSelectLabel)}</Form.Label>
            <Form.Control
              as="select"
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId((e as React.ChangeEvent<HTMLSelectElement>).target.value);
                setEnrollSuccess(false);
                setEnrollError(false);
              }}
            >
              <option value="">{intl.formatMessage(messages.batchSelectPlaceholder)}</option>
              {(batches ?? []).map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </Form.Control>
          </Form.Group>
        )}
      </ModalDialog.Header>

      <ModalDialog.Body>
        {enrollSuccess && (
          <Alert variant="success" className="mb-3">
            {intl.formatMessage(messages.enrolledAllSuccess)}
          </Alert>
        )}
        {enrollError && (
          <Alert variant="danger" className="mb-3">
            {intl.formatMessage(messages.enrollError)}
          </Alert>
        )}

        {!selectedBatchId && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.selectBatchPrompt)}</p>
        )}

        {selectedBatchId && isUsersLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" screenReaderText={intl.formatMessage(messages.loadingUsers)} />
          </div>
        )}

        {selectedBatchId && !isUsersLoading && batchUsers?.length === 0 && (
          <p className="text-muted text-center py-4">{intl.formatMessage(messages.noBatchUsers)}</p>
        )}

        {selectedBatchId && !isUsersLoading && batchUsers && batchUsers.length > 0 && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="mb-0 text-muted small">
                {batchUsers.length}
                {' '}
                learners ·
                {' '}
                {alreadyEnrolledIds.filter((id) => batchUsers.some((u) => u.id === id)).length}
                {' '}
                already enrolled
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnrollAll}
                disabled={isEnrollingAll || unenrolledUsers.length === 0}
              >
                {isEnrollingAll
                  ? intl.formatMessage(messages.enrollingAllBtn)
                  : intl.formatMessage(messages.enrollAllBtn)}
              </Button>
            </div>
            {batchUsers.map((user) => {
              const isEnrolled = alreadyEnrolledIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  className="d-flex justify-content-between align-items-center py-3"
                  style={{ borderBottom: '1px solid #dee2e6' }}
                >
                  <div>
                    <p className="mb-1 font-weight-bold">{user.name}</p>
                    <p className="mb-0 small text-muted">{user.email}</p>
                  </div>
                  {isEnrolled && (
                    <Badge variant="success">{intl.formatMessage(messages.enrolledBadge)}</Badge>
                  )}
                </div>
              );
            })}
          </>
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

export default EnrollBatchModal;
