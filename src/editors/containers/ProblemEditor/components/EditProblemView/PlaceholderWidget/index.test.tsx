import React from 'react';
import { screen, fireEvent, initializeMocks } from '@src/testUtils';
import { editorRender, getEditorStore } from '@src/editors/editorTestRender';
import { ProblemTypeKeys } from '@src/editors/data/constants/problem';
import PlaceholderWidget from './index';

describe('PlaceholderWidget', () => {
  beforeEach(() => {
    initializeMocks();
  });

  test.each([ProblemTypeKeys.DROPDOWN, ProblemTypeKeys.TEXTINPUT, ProblemTypeKeys.NUMERIC])(
    'shows the placeholder and saves edits for %s problems',
    (problemType) => {
      editorRender(<PlaceholderWidget problemType={problemType} />, {
        initialState: { problem: { settings: { placeholder: 'Type your answer' } } },
      });
      const input = screen.getByLabelText('Placeholder text');
      expect(input).toHaveValue('Type your answer');
      fireEvent.change(input, { target: { value: 'Enter a number' } });
      expect(getEditorStore().getState().problem.settings.placeholder).toBe('Enter a number');
    },
  );

  test('is hidden for single select problems', () => {
    editorRender(<PlaceholderWidget problemType={ProblemTypeKeys.SINGLESELECT} />);
    expect(screen.queryByLabelText('Placeholder text')).not.toBeInTheDocument();
  });
});
