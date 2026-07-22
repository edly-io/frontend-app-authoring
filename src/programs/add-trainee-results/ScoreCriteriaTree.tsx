import React from 'react';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { Card } from '@openedx/paragon';
import { SCORE_CELL_WIDTH } from './constants';
import ScoreSectionRow from './ScoreSectionRow';
import type { EditableSectionScore } from './types';

const messages = defineMessages({
  treeAriaLabel: { id: 'programs.trainee-results.tree.aria-label', defaultMessage: 'Scored evaluation criteria' },
  columnSection: { id: 'programs.trainee-results.column.section', defaultMessage: 'Section / line item' },
  columnMarksAwarded: { id: 'programs.trainee-results.column.marks-awarded', defaultMessage: 'Marks awarded' },
  emptyState: {
    id: 'programs.trainee-results.tree.empty-state',
    defaultMessage: 'This program does not have a published grade scheme yet.',
  },
});

interface ScoreCriteriaTreeProps {
  sections: EditableSectionScore[];
  canEdit: boolean;
  outOfRangeSubsectionIds: Set<number>;
  onMarksChange: (subsectionId: number, marksAwarded: number) => void;
}

const ScoreCriteriaTree: React.FC<ScoreCriteriaTreeProps> = ({
  sections, canEdit, outOfRangeSubsectionIds, onMarksChange,
}) => {
  const intl = useIntl();

  return (
    <Card>
      <Card.Body>
        <div role="table" className="px-3" aria-label={intl.formatMessage(messages.treeAriaLabel)}>
          <div
            role="row"
            className="d-flex align-items-center gap-2 px-3 py-2 small text-uppercase text-muted font-weight-bold"
          >
            <span role="columnheader" className="flex-grow-1" style={{ marginLeft: 36 }}>
              {intl.formatMessage(messages.columnSection)}
            </span>
            <span role="columnheader" className="px-2" style={{ width: SCORE_CELL_WIDTH }}>
              {intl.formatMessage(messages.columnMarksAwarded)}
            </span>
          </div>

          {sections.length === 0 ? (
            <p className="text-muted p-3 mb-0">{intl.formatMessage(messages.emptyState)}</p>
          ) : (
            sections.map((section, index) => (
              <ScoreSectionRow
                key={section.sectionId}
                section={section}
                index={index}
                canEdit={canEdit}
                outOfRangeSubsectionIds={outOfRangeSubsectionIds}
                onMarksChange={onMarksChange}
              />
            ))
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ScoreCriteriaTree;
