import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  Form,
  IconButtonWithTooltip,
  useToggle,
} from '@openedx/paragon';
import { DeleteOutline, Edit } from '@openedx/paragon/icons';

import DeleteCategoryDialog from './DeleteCategoryDialog';
import { useDeleteCategory, useRenameCategory } from './data/apiHooks';
import messages from './messages';
import type { Category } from './types';
import { errorMessageFor, getFieldError } from './utils';

interface CategoryRowProps {
  category: Category;
  /** Called once the category is deleted, so the list can confirm it. */
  onDeleted: (name: string) => void;
}

/** One category: its name and course count, with inline rename and a confirmed delete. */
const CategoryRow = ({ category, onDeleted }: CategoryRowProps) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [isDeleteOpen, openDelete, closeDelete] = useToggle(false);
  const rename = useRenameCategory();
  const remove = useDeleteCategory();
  const permissionError = intl.formatMessage(messages.permissionError);
  const saveError = intl.formatMessage(messages.saveError);

  const startEditing = () => {
    rename.reset();
    setName(category.name);
    setIsEditing(true);
  };
  const cancelEditing = () => {
    rename.reset();
    setIsEditing(false);
  };
  const save = () => {
    if (rename.isPending) {
      return;
    }
    rename.mutate({ slug: category.slug, name }, { onSuccess: () => setIsEditing(false) });
  };
  const confirmDelete = () => {
    if (remove.isPending) {
      return;
    }
    remove.mutate(category.slug, { onSuccess: () => onDeleted(category.name) });
  };
  const cancelDelete = () => {
    remove.reset();
    closeDelete();
  };

  const nameError = rename.isError ? getFieldError(rename.error, 'name') : undefined;
  const renameError = rename.isError && !nameError
    ? errorMessageFor(rename.error, permissionError, saveError)
    : undefined;
  const fieldId = `course-category-name-${category.slug}`;

  return (
    <li className="d-flex align-items-start py-2 border-bottom">
      {isEditing ?
        (
          <Form
            className="flex-grow-1 course-categories-min-width-0"
            onSubmit={(event: React.FormEvent) => {
              event.preventDefault();
              save();
            }}
          >
            <Form.Group controlId={fieldId} isInvalid={!!(nameError || renameError)} className="mb-0">
              <Form.Label className="sr-only">
                {intl.formatMessage(messages.nameLabel, { name: category.name })}
              </Form.Label>
              <div className="d-flex align-items-center">
                <Form.Control
                  autoFocus
                  value={name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                  onKeyDown={(event: React.KeyboardEvent) => {
                    if (event.key === 'Escape') {
                      // Don't let Escape close the whole dialog: it only cancels the rename.
                      event.stopPropagation();
                      cancelEditing();
                    }
                  }}
                />
                <Button type="submit" size="sm" className="ml-2 flex-shrink-0" disabled={rename.isPending}>
                  {intl.formatMessage(messages.save)}
                </Button>
                <Button variant="tertiary" size="sm" className="ml-1 flex-shrink-0" onClick={cancelEditing}>
                  {intl.formatMessage(messages.cancel)}
                </Button>
              </div>
              {(nameError || renameError) && (
                <Form.Control.Feedback type="invalid" hasIcon={false}>{nameError || renameError}</Form.Control.Feedback>
              )}
            </Form.Group>
          </Form>
        ) :
        (
          <div className="flex-grow-1 course-categories-min-width-0">
            <span className="d-block font-weight-bold text-truncate" title={category.name}>{category.name}</span>
            <span className="d-block small text-gray-700">
              {intl.formatMessage(messages.courseCount, { count: category.courseCount })}
            </span>
          </div>
        )}
      {!isEditing && (
        <div className="d-flex flex-shrink-0 ml-2">
          <IconButtonWithTooltip
            src={Edit}
            tooltipContent={intl.formatMessage(messages.rename)}
            alt={intl.formatMessage(messages.renameAria, { name: category.name })}
            onClick={startEditing}
          />
          <IconButtonWithTooltip
            src={DeleteOutline}
            tooltipContent={intl.formatMessage(messages.delete)}
            alt={intl.formatMessage(messages.deleteAria, { name: category.name })}
            onClick={openDelete}
          />
        </div>
      )}
      <DeleteCategoryDialog
        category={category}
        isOpen={isDeleteOpen}
        isPending={remove.isPending}
        error={remove.isError ? errorMessageFor(remove.error, permissionError, saveError) : undefined}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </li>
  );
};

export default CategoryRow;
