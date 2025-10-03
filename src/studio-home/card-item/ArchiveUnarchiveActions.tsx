import React from 'react';
import { Button, Dropdown, ModalDialog } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from '../messages';

type NullableString = string | null | undefined;

interface ArchiveUnarchiveActionsProps {
  archiveLink?: NullableString;
  unarchiveLink?: NullableString;
}

const ArchiveUnarchiveActions: React.FC<ArchiveUnarchiveActionsProps> = ({
  archiveLink,
  unarchiveLink,
}) => {
  const intl = useIntl();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmUrl, setConfirmUrl] = React.useState('');
  const [confirmText, setConfirmText] = React.useState('');

  const openConfirm = (url: string, text: string) => {
    setConfirmUrl(url);
    setConfirmText(text);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    window.location.href = confirmUrl;
  };

  return (
    <>
      <ModalDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title={intl.formatMessage(messages.confirmDialogTitle)} isOverflowVisible>
        <ModalDialog.Header>{intl.formatMessage(messages.confirmDialogTitle)}</ModalDialog.Header>
        <ModalDialog.Body>
          <p>{confirmText}</p>
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <div className="d-flex justify-content-end w-100">
            <Button className="mr-2 px-4" onClick={() => setConfirmOpen(false)}>{intl.formatMessage(messages.confirmDialogCancelBtn)}</Button>
            <Button className="px-4" variant="danger" onClick={handleConfirm}>{intl.formatMessage(messages.confirmDialogConfirmBtn)}</Button>
          </div>
        </ModalDialog.Footer>
      </ModalDialog>

      {archiveLink && (
        <Dropdown.Item href={archiveLink} onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          openConfirm(
            archiveLink,
            intl.formatMessage(messages.archiveConfirmMessage)
          );
        }}>
          {intl.formatMessage(messages.archiveBtnText)}
        </Dropdown.Item>
      )}
      {unarchiveLink && (
        <Dropdown.Item href={unarchiveLink} onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          openConfirm(
            unarchiveLink,
            intl.formatMessage(messages.unarchiveConfirmMessage)
          );
        }}>
          {intl.formatMessage(messages.unarchiveBtnText)}
        </Dropdown.Item>
      )}
    </>
  );
};

export default ArchiveUnarchiveActions;


