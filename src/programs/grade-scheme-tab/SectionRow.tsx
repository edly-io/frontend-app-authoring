import React from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Badge, Button, Form, Icon,
} from '@openedx/paragon';
import { Add, Lock } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { WEIGHTAGE_CELL_WIDTH } from './constants';
import RowActions from './RowActions';
import SubsectionRow from './SubsectionRow';
import type { EditableSection } from './types';
import { getSectionTotal } from './utils';

const messages = defineMessages({
  sectionLabelAria: { id: 'programs.scheme.section-label-aria', defaultMessage: 'Section name' },
  sumOfItems: { id: 'programs.scheme.sum-of-items', defaultMessage: '= Σ items' },
  addSubsectionBtn: { id: 'programs.scheme.add-subsection-btn', defaultMessage: 'Add line item' },
});

interface SectionRowProps {
  section: EditableSection;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canManage: boolean;
  onTitleChange: (title: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAddSubsection: () => void;
  onSubsectionTitleChange: (subsectionLocalId: string, title: string) => void;
  onSubsectionMaxMarksChange: (subsectionLocalId: string, maxMarks: number) => void;
  onMoveSubsection: (subsectionIndex: number, direction: -1 | 1) => void;
  onDeleteSubsection: (subsectionLocalId: string) => void;
}

const SectionRow: React.FC<SectionRowProps> = ({
  section,
  index,
  isFirst,
  isLast,
  canManage,
  onTitleChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddSubsection,
  onSubsectionTitleChange,
  onSubsectionMaxMarksChange,
  onMoveSubsection,
  onDeleteSubsection,
}) => {
  const intl = useIntl();
  const {
    setNodeRef, attributes, listeners, transform, transition, isDragging,
  } = useSortable({ id: section.localId, disabled: !canManage });
  const total = getSectionTotal(section);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        role="row"
        className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light"
      >
        <span
          className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-bold flex-shrink-0 mr-2"
          style={{ width: 28, height: 28, fontSize: '0.8rem' }}
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div role="cell" className="flex-grow-1">
          <Form.Control
            value={section.title}
            disabled={!canManage}
            onChange={(e) => onTitleChange(e.target.value)}
            className="form-control-plaintext fw-bold px-0"
            aria-label={intl.formatMessage(messages.sectionLabelAria)}
          />
        </div>
        <div role="cell" className="d-flex align-items-center gap-2 px-3" style={{ width: WEIGHTAGE_CELL_WIDTH }}>
          <Badge variant="info" className="d-flex align-items-center gap-1">
            <Icon src={Lock} size="xs" />
            {total}
          </Badge>
          <span className="text-muted small text-nowrap">{intl.formatMessage(messages.sumOfItems)}</span>
        </div>
        <div role="cell">
          <RowActions
            dragHandleProps={{ attributes, listeners }}
            label={section.title}
            canManage={canManage}
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
          />
        </div>
      </div>

      {section.subsections.length > 0 && (
        <SortableContext
          items={section.subsections.map((subsection) => subsection.localId)}
          strategy={verticalListSortingStrategy}
        >
          {section.subsections.map((subsection, subsectionIndex) => (
            <SubsectionRow
              key={subsection.localId}
              subsection={subsection}
              isFirst={subsectionIndex === 0}
              isLast={subsectionIndex === section.subsections.length - 1}
              canManage={canManage}
              onTitleChange={(title) => onSubsectionTitleChange(subsection.localId, title)}
              onMaxMarksChange={(maxMarks) => onSubsectionMaxMarksChange(subsection.localId, maxMarks)}
              onMoveUp={() => onMoveSubsection(subsectionIndex, -1)}
              onMoveDown={() => onMoveSubsection(subsectionIndex, 1)}
              onDelete={() => onDeleteSubsection(subsection.localId)}
            />
          ))}
        </SortableContext>
      )}

      {canManage && (
        <div role="row" className="py-2 border-bottom">
          <div role="cell" style={{ paddingLeft: 56 }}>
            <Button variant="outline-primary" size="sm" iconBefore={Add} onClick={onAddSubsection}>
              {intl.formatMessage(messages.addSubsectionBtn)}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default SectionRow;
