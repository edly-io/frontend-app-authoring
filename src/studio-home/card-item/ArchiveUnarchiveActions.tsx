import React from 'react';
import { Button, Dropdown, ModalDialog } from '@openedx/paragon';
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
      <ModalDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Are you sure?" isOverflowVisible>
        <ModalDialog.Header>Are you sure?</ModalDialog.Header>
        <ModalDialog.Body>
          <p>{confirmText}</p>
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <div className="d-flex justify-content-end w-100">
            <Button className="mr-2 px-4" onClick={() => setConfirmOpen(false)}>No</Button>
            <Button className="px-4" variant="danger" onClick={handleConfirm}>Yes</Button>
          </div>
        </ModalDialog.Footer>
      </ModalDialog>

      {archiveLink && (
        <Dropdown.Item href={archiveLink} onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          openConfirm(
            archiveLink,
            'Courses are archived by default when they pass their end date. Are you sure you want to archive this course anyway?'
          );
        }}>
          {messages.archiveBtnText.defaultMessage}
        </Dropdown.Item>
      )}
      {unarchiveLink && (
        <Dropdown.Item href={unarchiveLink} onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          openConfirm(
            unarchiveLink,
            'Are you sure you want to unarchive this course? End date for this course will be changed to 1 year from now. This course will still have to be published.'
          );
        }}>
          {messages.unarchiveBtnText.defaultMessage}
        </Dropdown.Item>
      )}
    </>
  );
};

export default ArchiveUnarchiveActions;


