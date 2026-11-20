import { useState } from 'react';
import {
  ActionRow, Alert, AlertModal, Button, Form,
} from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import RichTextEditor from '../generic/RichTextEditor';

const messages = defineMessages({
  subject: { id: 'programs.email.subject', defaultMessage: 'Subject' },
  body: { id: 'programs.email.body', defaultMessage: 'Message' },
  recipients: { id: 'programs.email.recipients', defaultMessage: 'Recipients' },
  myself: { id: 'programs.email.myself', defaultMessage: 'Myself' },
  active: { id: 'programs.email.active', defaultMessage: 'All active learners' },
  notCompleted: { id: 'programs.email.notCompleted', defaultMessage: 'Not completed' },
  count: { id: 'programs.email.count', defaultMessage: '{count} recipients, {skipped} opted out' },
  previewError: { id: 'programs.email.previewError', defaultMessage: 'Could not load the recipient count.' },
  send: { id: 'programs.email.send', defaultMessage: 'Send email' },
  confirm: { id: 'programs.email.confirm', defaultMessage: 'Send this email to {count} recipients?' },
  confirmSend: { id: 'programs.email.confirmSend', defaultMessage: 'Confirm send' },
  cancel: { id: 'programs.email.cancel', defaultMessage: 'Cancel' },
  queued: { id: 'programs.email.queued', defaultMessage: 'Email submitted. Check history for its status.' },
  error: { id: 'programs.email.error', defaultMessage: 'Could not send the email.' },
  history: { id: 'programs.email.history', defaultMessage: 'Email history' },
  historyError: { id: 'programs.email.historyError', defaultMessage: 'Could not load email history.' },
  counts: { id: 'programs.email.counts', defaultMessage: '{sent} sent, {failed} failed, {skipped} skipped' },
  queuedStatus: { id: 'programs.email.status.queued', defaultMessage: 'Queued' },
  sendingStatus: { id: 'programs.email.status.sending', defaultMessage: 'Sending' },
  completeStatus: { id: 'programs.email.status.complete', defaultMessage: 'Complete' },
  failedStatus: { id: 'programs.email.status.failed', defaultMessage: 'Failed' },
});

interface HistoryItem {
  id: number; subject: string; status: 'queued' | 'sending' | 'complete' | 'failed';
  sent_count: number; failed_count: number; skipped_count: number;
}

const ProgramEmailTab = ({ programId }: { programId: string }) => {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [recipients, setRecipients] = useState('myself');
  const [confirming, setConfirming] = useState(false);
  const statusMessages = {
    queued: messages.queuedStatus,
    sending: messages.sendingStatus,
    complete: messages.completeStatus,
    failed: messages.failedStatus,
  };
  const base = `${getConfig().STUDIO_BASE_URL}/rwaq/api/programs/${encodeURIComponent(programId)}`;
  const preview = useQuery({
    queryKey: ['programEmailRecipients', programId, recipients],
    queryFn: async () => (await getAuthenticatedHttpClient().get(`${base}/email-recipients/`, { params: { recipients } })).data as { count: number; skipped_count: number },
  });
  const history = useQuery({
    queryKey: ['programEmailHistory', programId],
    queryFn: async () => (await getAuthenticatedHttpClient().get(`${base}/emails/`)).data as HistoryItem[],
    refetchInterval: (query) => (query.state.data?.some((item) => item.status === 'queued' || item.status === 'sending') ? 5000 : false),
  });
  const send = useMutation({
    mutationFn: async () => getAuthenticatedHttpClient().post(`${base}/emails/`, { subject, body, recipients }),
    onSuccess: () => {
      setSubject(''); setBody(''); setEditorKey((key) => key + 1);
      queryClient.invalidateQueries({ queryKey: ['programEmailHistory', programId] });
    },
  });

  return (
    <div className="p-3">
      {send.isError && <Alert variant="danger">{intl.formatMessage(messages.error)}</Alert>}
      {send.isSuccess && <Alert variant="success">{intl.formatMessage(messages.queued)}</Alert>}
      <Form.Group controlId="program-email-subject">
        <Form.Label>{intl.formatMessage(messages.subject)}</Form.Label>
        <Form.Control
          value={subject}
          maxLength={128}
          onChange={(event) => {
            setConfirming(false); setSubject(event.target.value); if (send.isSuccess) { send.reset(); }
          }}
        />
      </Form.Group>
      <Form.Group controlId="program-email-recipients">
        <Form.Label>{intl.formatMessage(messages.recipients)}</Form.Label>
        <Form.Control
          as="select"
          value={recipients}
          onChange={(event) => {
            setConfirming(false); setRecipients(event.target.value); if (send.isSuccess) { send.reset(); }
          }}
        >
          <option value="myself">{intl.formatMessage(messages.myself)}</option>
          <option value="active">{intl.formatMessage(messages.active)}</option>
          <option value="not_completed">{intl.formatMessage(messages.notCompleted)}</option>
        </Form.Control>
      </Form.Group>
      {preview.isError && <Alert variant="danger">{intl.formatMessage(messages.previewError)}</Alert>}
      {preview.data && (
        <p>{intl.formatMessage(messages.count, { count: preview.data.count, skipped: preview.data.skipped_count })}</p>
      )}
      <p>{intl.formatMessage(messages.body)}</p>
      <RichTextEditor
        value={body}
        editorKey={editorKey}
        ariaLabel={intl.formatMessage(messages.body)}
        onChange={(value) => { setConfirming(false); setBody(value); if (send.isSuccess) { send.reset(); } }}
      />
      <Button
        className="mt-3"
        disabled={!subject.trim() || !body.trim() || !preview.data?.count || preview.isFetching || send.isPending}
        onClick={() => setConfirming(true)}
      >
        {intl.formatMessage(messages.send)}
      </Button>
      <AlertModal
        title={intl.formatMessage(messages.send)}
        isOpen={confirming && !!preview.data}
        onClose={() => setConfirming(false)}
        variant="default"
        footerNode={(
          <ActionRow>
            <Button variant="outline-primary" onClick={() => setConfirming(false)}>
              {intl.formatMessage(messages.cancel)}
            </Button>
            <Button onClick={() => { setConfirming(false); send.mutate(); }}>
              {intl.formatMessage(messages.confirmSend)}
            </Button>
          </ActionRow>
        )}
      >
        {intl.formatMessage(messages.confirm, { count: preview.data?.count ?? 0 })}
      </AlertModal>
      <h3 className="mt-4">{intl.formatMessage(messages.history)}</h3>
      {history.isError && <Alert variant="danger">{intl.formatMessage(messages.historyError)}</Alert>}
      {history.data?.map((item) => (
        <div key={item.id} className="border-bottom py-2">
          <strong>{item.subject}</strong> ({statusMessages[item.status]
            ? intl.formatMessage(statusMessages[item.status]) : item.status})
          <div>
            {intl.formatMessage(messages.counts, {
              sent: item.sent_count, failed: item.failed_count, skipped: item.skipped_count,
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgramEmailTab;
