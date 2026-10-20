import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow,
  Alert,
  AlertModal,
  Button,
} from '@openedx/paragon';

import messages from './messages';
import type { Category } from './types';

interface DeleteCategoryDialogProps {
  category: Category;
  isOpen: boolean;
  isPending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirms deleting a category, saying how many courses lose it. */
const DeleteCategoryDialog = ({
  category,
  isOpen,
  isPending,
  error,
  onConfirm,
  onCancel,
}: DeleteCategoryDialogProps) => {
  const intl = useIntl();
  return (
    <AlertModal
      title={intl.formatMessage(messages.deleteTitle, { name: category.name })}
      isOpen={isOpen}
      onClose={onCancel}
      footerNode={
        <ActionRow>
          <Button variant="tertiary" onClick={onCancel} disabled={isPending}>
            {intl.formatMessage(messages.cancel)}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {intl.formatMessage(messages.delete)}
          </Button>
        </ActionRow>
      }
    >
      {error && <Alert variant="danger">{error}</Alert>}
      <p className="mb-0">{intl.formatMessage(messages.deleteBody, { count: category.courseCount })}</p>
    </AlertModal>
  );
};

export default DeleteCategoryDialog;
