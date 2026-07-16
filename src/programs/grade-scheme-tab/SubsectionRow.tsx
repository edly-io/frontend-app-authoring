import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Form } from '@openedx/paragon';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { WEIGHTAGE_CELL_WIDTH } from './constants';
import RowActions from './RowActions';
import type { EditableSubsection } from './types';

const messages = defineMessages({
  subsectionLabelAria: { id: 'programs.scheme.subsection-label-aria', defaultMessage: 'Line item name' },
  maxMarksInputAria: { id: 'programs.scheme.max-marks-input-aria', defaultMessage: 'Max marks for {label}' },
});

interface SubsectionRowProps {
  subsection: EditableSubsection;
  isFirst: boolean;
  isLast: boolean;
  canManage: boolean;
  onTitleChange: (title: string) => void;
  onMaxMarksChange: (maxMarks: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

const SubsectionRow: React.FC<SubsectionRowProps> = ({
  subsection, isFirst, isLast, canManage, onTitleChange, onMaxMarksChange, onMoveUp, onMoveDown, onDelete,
}) => {
  const intl = useIntl();
  const {
    setNodeRef, attributes, listeners, transform, transition, isDragging,
  } = useSortable({ id: subsection.localId, disabled: !canManage });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="row"
      className="d-flex align-items-center gap-2 py-2 px-3 border-bottom bg-white"
    >
      <div role="cell" className="flex-grow-1" style={{ marginLeft: 40 }}>
        <Form.Control
          value={subsection.title}
          disabled={!canManage}
          onChange={(e) => onTitleChange(e.target.value)}
          className="form-control-plaintext px-0 mr-0"
          aria-label={intl.formatMessage(messages.subsectionLabelAria)}
        />
      </div>
      <div role="cell" className="px-3" style={{ width: WEIGHTAGE_CELL_WIDTH }}>
        <Form.Control
          type="number"
          min={0}
          value={subsection.maxMarks}
          disabled={!canManage}
          onChange={(e) => onMaxMarksChange(Number(e.target.value) || 0)}
          onFocus={(e) => e.target.select()}
          style={{ maxWidth: 90 }}
          aria-label={intl.formatMessage(messages.maxMarksInputAria, { label: subsection.title })}
        />
      </div>
      <div role="cell" className="pe-3">
        <RowActions
          dragHandleProps={{ attributes, listeners }}
          label={subsection.title}
          canManage={canManage}
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};

export default SubsectionRow;
