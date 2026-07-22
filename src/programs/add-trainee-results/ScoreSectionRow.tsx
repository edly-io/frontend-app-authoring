import React from 'react';
import {
  Form, Icon,
} from '@openedx/paragon';
import { Lock } from '@openedx/paragon/icons';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import { SCORE_CELL_WIDTH } from './constants';
import type { EditableSectionScore } from './types';
import { getSectionScoreTotal, getSectionVariant } from './utils';

const messages = defineMessages({
  marksAwardedInputAria: {
    id: 'programs.trainee-results.marks-awarded-input-aria',
    defaultMessage: 'Marks awarded for {label}',
  },
  outOfMaxMarks: {
    id: 'programs.trainee-results.out-of-max-marks',
    defaultMessage: '/ {maxMarks}',
  },
});

interface ScoreSectionRowProps {
  section: EditableSectionScore;
  index: number;
  canEdit: boolean;
  outOfRangeSubsectionIds: Set<number>;
  onMarksChange: (subsectionId: number, marksAwarded: number) => void;
}

const ScoreSectionRow: React.FC<ScoreSectionRowProps> = ({
  section, index, canEdit, outOfRangeSubsectionIds, onMarksChange,
}) => {
  const intl = useIntl();
  const total = getSectionScoreTotal(section);

  return (
    <>
      <div role="row" className={`d-flex align-items-center gap-2 rounded-lg px-3 py-2 bg-${getSectionVariant(index)}-100`}>
        <span
          className={`d-flex align-items-center justify-content-center rounded-circle text-white font-weight-bold flex-shrink-0 mr-2 bg-${getSectionVariant(index)}-800`}
          style={{ width: 28, height: 28, fontSize: '0.8rem' }}
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div role="cell" className="flex-grow-1 font-weight-bold">{section.title}</div>
        <div role="cell" className="d-flex align-items-center gap-2 px-3" style={{ width: SCORE_CELL_WIDTH }}>
          <span className={`d-flex px-1 align-items-center gap-1 bg-white text-gray-400 rounded-lg border-${getSectionVariant(index)}-800`} style={{ border: '2px solid' }}>
            <Icon src={Lock} size="xs" />
            <strong className={`small font-weight-bold text-${getSectionVariant(index)}-800`}>
              {total} {intl.formatMessage(messages.outOfMaxMarks, { maxMarks: section.maxMarks })}
            </strong>
          </span>
        </div>
      </div>

      <div className="subsections pb-2" style={{ paddingLeft: 40 }}>
        {section.subsections.map((subsection, subsectionIndex) => (
          <div
            key={subsection.subsectionId}
            role="row"
            className={`subsection-row d-flex align-items-center gap-2 py-2 mx-3 ${subsectionIndex === 0 ? '' : 'border-top'} bg-white`}
          >
            <div role="cell" className="flex-grow-1">
              {subsection.title}
            </div>
            <div role="cell" className="px-3 d-flex align-items-center flex-shrink-0" style={{ width: SCORE_CELL_WIDTH }}>
              <Form.Control
                type="number"
                min={0}
                max={subsection.maxMarks}
                value={subsection.marksAwarded}
                disabled={!canEdit}
                isInvalid={outOfRangeSubsectionIds.has(subsection.subsectionId)}
                onChange={(e) => onMarksChange(subsection.subsectionId, Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                style={{ maxWidth: 100 }}
                aria-label={intl.formatMessage(messages.marksAwardedInputAria, { label: subsection.title })}
              />
              <span className="text-muted small ms-1 text-nowrap">
                {intl.formatMessage(messages.outOfMaxMarks, { maxMarks: subsection.maxMarks })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ScoreSectionRow;
