import React from 'react';

import { ProblemTypeKeys } from '@src/editors/data/constants/problem';
import { screen, fireEvent, initializeMocks } from '@src/testUtils';
import { editorRender, getEditorStore } from '@src/editors/editorTestRender';
import AnswerWidget from '.';

jest.mock('./AnswersContainer', () => () => <div>AnswersContainer</div>);

describe('AnswerWidget incorrect answer feedback', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it.each([ProblemTypeKeys.TEXTINPUT, ProblemTypeKeys.NUMERIC])('edits the general feedback for %s', (problemType) => {
    editorRender(<AnswerWidget problemType={problemType} />, {
      initialState: { problem: { generalFeedback: 'Try again.' } },
    });
    const field = screen.getByRole('textbox', { name: 'Feedback for incorrect answers' });
    expect(field).toHaveValue('Try again.');

    fireEvent.change(field, { target: { value: 'Not quite.' } });
    const { problem } = getEditorStore().getState();
    expect(problem.generalFeedback).toBe('Not quite.');
    expect(problem.isDirty).toBe(true);
  });

  it('is not shown for other problem types', () => {
    editorRender(<AnswerWidget problemType={ProblemTypeKeys.SINGLESELECT} />);
    expect(screen.queryByText('Feedback for incorrect answers')).not.toBeInTheDocument();
  });
});
