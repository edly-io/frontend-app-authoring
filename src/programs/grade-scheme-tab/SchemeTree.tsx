import React, { useCallback } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { WEIGHTAGE_CELL_WIDTH, ACTIONS_CELL_WIDTH } from './constants';
import SectionRow from './SectionRow';
import type { EditableSection } from './types';

const messages = defineMessages({
  treeAriaLabel: { id: 'programs.scheme.tree.aria-label', defaultMessage: 'Weighted evaluation criteria' },
  columnSection: { id: 'programs.scheme.column.section', defaultMessage: 'Section / line item' },
  columnWeightage: { id: 'programs.scheme.column.weightage', defaultMessage: 'Max marks' },
  columnActions: { id: 'programs.scheme.column.actions', defaultMessage: 'Actions' },
  addSectionBtn: { id: 'programs.scheme.add-section-btn', defaultMessage: 'Add section' },
});

interface SchemeTreeProps {
  sections: EditableSection[];
  canManage: boolean;
  onSectionsChange: (updater: (sections: EditableSection[]) => EditableSection[]) => void;
  onAddSection: () => void;
  onDeleteSection: (section: EditableSection) => void;
  onAddSubsection: (sectionLocalId: string) => void;
  onDeleteSubsection: (sectionLocalId: string, subsectionLocalId: string) => void;
}

const SchemeTree: React.FC<SchemeTreeProps> = ({
  sections, canManage, onSectionsChange, onAddSection, onDeleteSection, onAddSubsection, onDeleteSubsection,
}) => {
  const intl = useIntl();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateSectionTitle = useCallback((sectionLocalId: string, title: string) => {
    onSectionsChange((prev) => prev.map((section) => (
      section.localId === sectionLocalId ? { ...section, title } : section
    )));
  }, [onSectionsChange]);

  const moveSection = useCallback((index: number, direction: -1 | 1) => {
    onSectionsChange((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      return arrayMove(prev, index, targetIndex);
    });
  }, [onSectionsChange]);

  const updateSubsectionTitle = useCallback((sectionLocalId: string, subsectionLocalId: string, title: string) => {
    onSectionsChange((prev) => prev.map((section) => (
      section.localId === sectionLocalId
        ? {
          ...section,
          subsections: section.subsections.map((subsection) => (
            subsection.localId === subsectionLocalId ? { ...subsection, title } : subsection
          )),
        }
        : section
    )));
  }, [onSectionsChange]);

  const updateSubsectionMaxMarks = useCallback((
    sectionLocalId: string,
    subsectionLocalId: string,
    maxMarks: number,
  ) => {
    onSectionsChange((prev) => prev.map((section) => (
      section.localId === sectionLocalId
        ? {
          ...section,
          subsections: section.subsections.map((subsection) => (
            subsection.localId === subsectionLocalId ? { ...subsection, maxMarks } : subsection
          )),
        }
        : section
    )));
  }, [onSectionsChange]);

  const moveSubsection = useCallback((sectionLocalId: string, index: number, direction: -1 | 1) => {
    onSectionsChange((prev) => prev.map((section) => {
      if (section.localId !== sectionLocalId) {
        return section;
      }
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= section.subsections.length) {
        return section;
      }
      return { ...section, subsections: arrayMove(section.subsections, index, targetIndex) };
    }));
  }, [onSectionsChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);

    onSectionsChange((prev) => {
      const activeSectionIndex = prev.findIndex((section) => section.localId === activeId);
      if (activeSectionIndex !== -1) {
        const overSectionIndex = prev.findIndex((section) => section.localId === overId);
        return overSectionIndex === -1 ? prev : arrayMove(prev, activeSectionIndex, overSectionIndex);
      }

      const ownerIndex = prev.findIndex(
        (section) => section.subsections.some((subsection) => subsection.localId === activeId),
      );
      if (ownerIndex === -1) {
        return prev;
      }
      const owner = prev[ownerIndex];
      const oldIndex = owner.subsections.findIndex((subsection) => subsection.localId === activeId);
      const newIndex = owner.subsections.findIndex((subsection) => subsection.localId === overId);
      if (newIndex === -1) {
        return prev;
      }
      const next = [...prev];
      next[ownerIndex] = { ...owner, subsections: arrayMove(owner.subsections, oldIndex, newIndex) };
      return next;
    });
  }, [onSectionsChange]);

  return (
    <div className="border rounded bg-white">
      <div role="table" aria-label={intl.formatMessage(messages.treeAriaLabel)}>
        <div
          role="row"
          className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light small text-uppercase text-muted fw-bold"
        >
          <span role="columnheader" className="flex-grow-1" style={{ marginLeft: 36 }}>
            {intl.formatMessage(messages.columnSection)}
          </span>
          <span role="columnheader" className="px-2" style={{ width: WEIGHTAGE_CELL_WIDTH }}>
            {intl.formatMessage(messages.columnWeightage)}
          </span>
          <span role="columnheader" className="text-end" style={{ width: ACTIONS_CELL_WIDTH }}>
            {intl.formatMessage(messages.columnActions)}
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((section) => section.localId)} strategy={verticalListSortingStrategy}>
            {sections.map((section, sectionIndex) => (
              <SectionRow
                key={section.localId}
                section={section}
                index={sectionIndex}
                isFirst={sectionIndex === 0}
                isLast={sectionIndex === sections.length - 1}
                canManage={canManage}
                onTitleChange={(title) => updateSectionTitle(section.localId, title)}
                onMoveUp={() => moveSection(sectionIndex, -1)}
                onMoveDown={() => moveSection(sectionIndex, 1)}
                onDelete={() => onDeleteSection(section)}
                onAddSubsection={() => onAddSubsection(section.localId)}
                onSubsectionTitleChange={(subsectionLocalId, title) => (
                  updateSubsectionTitle(section.localId, subsectionLocalId, title)
                )}
                onSubsectionMaxMarksChange={(subsectionLocalId, maxMarks) => (
                  updateSubsectionMaxMarks(section.localId, subsectionLocalId, maxMarks)
                )}
                onMoveSubsection={(subsectionIndex, direction) => (
                  moveSubsection(section.localId, subsectionIndex, direction)
                )}
                onDeleteSubsection={(subsectionLocalId) => onDeleteSubsection(section.localId, subsectionLocalId)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {canManage && (
        <div className="p-3">
          <Button variant="outline-primary" iconBefore={Add} onClick={onAddSection}>
            {intl.formatMessage(messages.addSectionBtn)}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SchemeTree;
