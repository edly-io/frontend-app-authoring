import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';
import { Form } from '@openedx/paragon';
import { actions, selectors } from '@src/editors/data/redux';
import { PlaceholderProblemTypes } from '@src/editors/data/constants/problem';
import messages from './messages';

interface Props {
  problemType: string;
}

// Uber: text shown in the empty dropdown or text field, saved as the input's placeholder attribute.
const PlaceholderWidget = ({ problemType }: Props) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const { placeholder } = useSelector(selectors.problem.settings);

  if (!(PlaceholderProblemTypes as readonly string[]).includes(problemType)) { return null; }

  return (
    <div className="mt-4 text-primary-500">
      <div className="h4 mb-3">
        <FormattedMessage {...messages.title} />
      </div>
      <div className="small mb-3">
        <FormattedMessage {...messages.description} />
      </div>
      <Form.Group>
        <Form.Control
          value={placeholder || ''}
          onChange={(e) => dispatch(actions.problem.updateSettings({ placeholder: e.target.value }))}
          floatingLabel={intl.formatMessage(messages.inputLabel)}
        />
      </Form.Group>
    </div>
  );
};

export default PlaceholderWidget;
