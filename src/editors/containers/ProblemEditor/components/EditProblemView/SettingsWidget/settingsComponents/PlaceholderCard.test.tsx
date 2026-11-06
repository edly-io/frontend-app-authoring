import React from 'react';
import {
  render,
  screen,
  fireEvent,
  initializeMocks,
} from '@src/testUtils';
import PlaceholderCard from './PlaceholderCard';

describe('PlaceholderCard', () => {
  const updateSettings = jest.fn();

  beforeEach(() => {
    initializeMocks();
    updateSettings.mockClear();
  });

  test('summarises an unset placeholder as None', () => {
    render(<PlaceholderCard placeholder="" updateSettings={updateSettings} />);
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  test('summarises the placeholder and saves edits', () => {
    render(<PlaceholderCard placeholder="Type your answer" updateSettings={updateSettings} />);
    expect(screen.getByText('Type your answer')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Placeholder'));
    fireEvent.change(screen.getByLabelText('Placeholder text'), { target: { value: 'Enter a number' } });
    expect(updateSettings).toHaveBeenCalledWith({ placeholder: 'Enter a number' });
  });
});
