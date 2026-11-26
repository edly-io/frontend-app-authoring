import React, { useState } from 'react';
import {
  ActionRow, Alert, Button, Form, ModalDialog,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { useBulkEnrollProgram } from '../data/apiHooks';
import { getApiErrorDetail, type ProgramBulkEnrollResult } from '../data/api';

const messages = defineMessages({
  title: { id: 'programs.bulk.title', defaultMessage: 'Bulk enroll learners' },
  emails: { id: 'programs.bulk.emails', defaultMessage: 'Email addresses' },
  help: { id: 'programs.bulk.help', defaultMessage: 'Separate addresses with commas or new lines. You can enter up to 200 addresses.' },
  reason: { id: 'programs.bulk.reason', defaultMessage: 'Reason (optional)' },
  autoEnroll: { id: 'programs.bulk.autoEnroll', defaultMessage: 'Auto enroll people when they register with this email address' },
  notify: { id: 'programs.bulk.notify', defaultMessage: 'Notify by email' },
  notificationFailures: { id: 'programs.bulk.notificationFailures', defaultMessage: 'Could not queue notifications for:' },
  paidNotice: { id: 'programs.bulk.paidNotice', defaultMessage: 'Each enrollment creates a zero-price admin grant order.' },
  submit: { id: 'programs.bulk.submit', defaultMessage: 'Enroll learners' },
  close: { id: 'programs.bulk.close', defaultMessage: 'Close' },
  error: { id: 'programs.bulk.error', defaultMessage: 'Could not enroll learners.' },
  enrolled: { id: 'programs.bulk.enrolled', defaultMessage: '{count} enrolled' },
  already: { id: 'programs.bulk.already', defaultMessage: '{count} already enrolled' },
  invited: { id: 'programs.bulk.invited', defaultMessage: '{count} invited' },
  pendingWithoutAutoEnroll: { id: 'programs.bulk.pendingWithoutAutoEnroll', defaultMessage: 'Invitations remain pending and will not enroll learners automatically.' },
  pendingWithoutNotification: { id: 'programs.bulk.pendingWithoutNotification', defaultMessage: 'No invitation email was sent.' },
  courseFailures: { id: 'programs.bulk.courseFailures', defaultMessage: 'Some course enrollments failed.' },
});

interface Props {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  isPaid: boolean;
}

const BulkEnrollModal: React.FC<Props> = ({
  isOpen, onClose, programId, isPaid,
}) => {
  const intl = useIntl();
  const [emails, setEmails] = useState('');
  const [reason, setReason] = useState('');
  const [autoEnroll, setAutoEnroll] = useState(false);
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ProgramBulkEnrollResult | null>(null);
  const mutation = useBulkEnrollProgram();
  const addressCount = new Set(emails.toLowerCase().split(/[,;\s]+/).filter(Boolean)).size;

  const close = () => {
    setEmails(''); setReason(''); setAutoEnroll(false); setNotify(false); setError(''); setFieldErrors({}); setResult(null); onClose();
  };
  const submit = async () => {
    setError('');
    setFieldErrors({});
    try {
      setResult(await mutation.mutateAsync({
        programId, emails, reason: reason.trim(), autoEnroll, notify,
      }));
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const errors: Record<string, string> = {};
      ['emails', 'reason'].forEach((field) => {
        const value = data?.[field];
        if (Array.isArray(value) && typeof value[0] === 'string') { [errors[field]] = value; }
      });
      setFieldErrors(errors);
      if (!Object.keys(errors).length) { setError(getApiErrorDetail(err) ?? intl.formatMessage(messages.error)); }
    }
  };
  return (
    <ModalDialog
      title={intl.formatMessage(messages.title)}
      isOpen={isOpen}
      onClose={close}
      size="lg"
      hasCloseButton
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{intl.formatMessage(messages.title)}</ModalDialog.Title>
      </ModalDialog.Header>
      <ModalDialog.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {isPaid && <Alert variant="info">{intl.formatMessage(messages.paidNotice)}</Alert>}
        {!result && (
          <>
            <Form.Group controlId="program-bulk-emails">
              <Form.Label>{intl.formatMessage(messages.emails)}</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={emails}
                isInvalid={!!fieldErrors.emails}
                aria-invalid={!!fieldErrors.emails}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmails(e.target.value)}
              />
              {fieldErrors.emails && <Form.Control.Feedback type="invalid">{fieldErrors.emails}</Form.Control.Feedback>}
              <Form.Text>{intl.formatMessage(messages.help)}</Form.Text>
            </Form.Group>
            <Form.Group controlId="program-bulk-reason">
              <Form.Label>{intl.formatMessage(messages.reason)}</Form.Label>
              <Form.Control
                value={reason}
                isInvalid={!!fieldErrors.reason}
                aria-invalid={!!fieldErrors.reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
              />
              {fieldErrors.reason && <Form.Control.Feedback type="invalid">{fieldErrors.reason}</Form.Control.Feedback>}
            </Form.Group>
            <div className="mb-2">
              <Form.Checkbox
                checked={autoEnroll}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoEnroll(e.target.checked)}
              >
                {intl.formatMessage(messages.autoEnroll)}
              </Form.Checkbox>
            </div>
            <div>
              <Form.Checkbox
                checked={notify}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotify(e.target.checked)}
              >
                {intl.formatMessage(messages.notify)}
              </Form.Checkbox>
            </div>
          </>
        )}
        {result && (
          <>
            <p>{intl.formatMessage(messages.enrolled, { count: result.enrolled.length })}</p>
            <p>{intl.formatMessage(messages.already, { count: result.already_enrolled.length })}</p>
            <p>{intl.formatMessage(messages.invited, { count: result.invited.length })}</p>
            {result.invited.length > 0 && !autoEnroll && <p>{intl.formatMessage(messages.pendingWithoutAutoEnroll)}</p>}
            {result.invited.length > 0 && !notify && <p>{intl.formatMessage(messages.pendingWithoutNotification)}</p>}
            {result.failed.map((failure) => <p key={failure.email}>{failure.email}: {failure.reason}</p>)}
            {result.course_failures.length > 0 && (
              <Alert variant="warning">
                {intl.formatMessage(messages.courseFailures)}
                {result.course_failures.map((failure) => (
                  <p key={`${failure.email}-${failure.course_id}`}>{failure.email}: {failure.course_id}: {failure.reason}</p>
                ))}
              </Alert>
            )}
            {result.notification_failures.length > 0 && (
              <Alert variant="warning">
                {intl.formatMessage(messages.notificationFailures)}
                {' '}
                {result.notification_failures.map((item) => item.email).join(', ')}
              </Alert>
            )}
          </>
        )}
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="outline-primary" onClick={close}>{intl.formatMessage(messages.close)}</Button>
          {!result && (
            <Button disabled={!emails.trim() || addressCount > 200 || mutation.isPending} onClick={submit}>
              {intl.formatMessage(messages.submit)}
            </Button>
          )}
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

export default BulkEnrollModal;
