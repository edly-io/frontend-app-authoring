import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';

import { getProblemTypes, ProblemTypeKeys } from '@src/editors/data/constants/problem';
import { actions, selectors } from '@src/editors/data/redux';
import messages from './messages';
import AnswersContainer from './AnswersContainer';

// Text and numeric input: one feedback message for any wrong answer, saved as a catch-all hint.
const IncorrectFeedback = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const generalFeedback = useSelector(selectors.problem.generalFeedback);
  return (
    <Form.Group controlId="incorrect-answer-feedback" className="mt-4 text-primary-500">
      <Form.Label className="h4 d-block mb-0">
        <FormattedMessage {...messages.incorrectFeedbackTitle} />
      </Form.Label>
      <div id="incorrect-answer-feedback-help" className="small mb-3">
        <FormattedMessage {...messages.incorrectFeedbackHelperText} />
      </div>
      <Form.Control
        as="textarea"
        autoResize
        rows={2}
        value={generalFeedback || ''}
        onChange={(e) => dispatch(actions.problem.updateField({ generalFeedback: e.target.value, isDirty: true }))}
        placeholder={intl.formatMessage(messages.incorrectFeedbackPlaceholder)}
        aria-describedby="incorrect-answer-feedback-help"
      />
    </Form.Group>
  );
};

// This widget should be connected, grab all answers from store, update them as needed.
const AnswerWidget = ({
  // Redux
  problemType,
}) => {
  const intl = useIntl();

  const localizedProblemTypes = getProblemTypes(intl.formatMessage);
  const localizedProblemStaticData = localizedProblemTypes[problemType];

  return (
    <div>
      <div className="mt-4 text-primary-500">
        <div className="h4">
          <FormattedMessage {...messages.answerWidgetTitle} />
        </div>
        <div className="small">
          <FormattedMessage
            {...messages.answerHelperText}
            values={{ helperText: localizedProblemStaticData.description }}
          />
        </div>
      </div>
      <AnswersContainer problemType={problemType} />
      {[ProblemTypeKeys.TEXTINPUT, ProblemTypeKeys.NUMERIC].includes(problemType) && <IncorrectFeedback />}
    </div>
  );
};

AnswerWidget.propTypes = {
  problemType: PropTypes.string.isRequired,
};
export const AnswerWidgetInternal = AnswerWidget; // For testing only
export default AnswerWidget;
