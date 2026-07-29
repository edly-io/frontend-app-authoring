import React from 'react';
import { IconButton } from '@openedx/paragon';
import {
  DeleteOutline,
  DragIndicator,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import type { useSortable } from '@dnd-kit/sortable';
import { ACTIONS_CELL_WIDTH } from './constants';

const messages = defineMessages({
  moveUpAria: { id: 'programs.scheme.move-up-aria', defaultMessage: 'Move {label} up' },
  moveDownAria: { id: 'programs.scheme.move-down-aria', defaultMessage: 'Move {label} down' },
  deleteAria: { id: 'programs.scheme.delete-aria', defaultMessage: 'Delete {label}' },
  dragHandleAria: { id: 'programs.scheme.drag-handle-aria', defaultMessage: 'Reorder {label}' },
});

interface RowActionsProps {
  dragHandleProps: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  };
  label: string;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

/** Drag handle + up/down/delete controls shared by section and subsection rows. */
const RowActions: React.FC<RowActionsProps> = ({
  dragHandleProps, label, canManage, isFirst, isLast, onMoveUp, onMoveDown, onDelete,
}) => {
  const intl = useIntl();

  if (!canManage) {
    return <div style={{ width: ACTIONS_CELL_WIDTH }} />;
  }

  return (
    <div className="d-flex align-items-center justify-content-end gap-1" style={{ width: ACTIONS_CELL_WIDTH }}>
      <IconButton
        src={DragIndicator}
        variant="primary"
        size="inline"
        alt={intl.formatMessage(messages.dragHandleAria, { label })}
        {...dragHandleProps.attributes}
        {...dragHandleProps.listeners}
      />
      <IconButton
        src={KeyboardArrowUp}
        variant="primary"
        size="inline"
        alt={intl.formatMessage(messages.moveUpAria, { label })}
        aria-disabled={isFirst}
        className={isFirst ? 'opacity-25' : undefined}
        onClick={isFirst ? undefined : onMoveUp}
      />
      <IconButton
        src={KeyboardArrowDown}
        size="inline"
        alt={intl.formatMessage(messages.moveDownAria, { label })}
        aria-disabled={isLast}
        className={isLast ? 'opacity-25' : undefined}
        onClick={isLast ? undefined : onMoveDown}
      />
      <IconButton
        src={DeleteOutline}
        variant="danger"
        size="inline"
        alt={intl.formatMessage(messages.deleteAria, { label })}
        onClick={onDelete}
      />
    </div>
  );
};

export default RowActions;
