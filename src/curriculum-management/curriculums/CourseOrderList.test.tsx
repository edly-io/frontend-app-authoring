import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import CourseOrderList, { type CourseItem } from './CourseOrderList';

const initial: CourseItem[] = [
  { id: 'course-v1:A+1+R', displayName: 'Alpha', exists: true },
  { id: 'course-v1:A+2+R', displayName: 'Beta', exists: true },
  { id: 'course-v1:A+3+R', displayName: null, exists: false },
];

const Harness = ({ rowErrors, start = initial }: { rowErrors?: Record<string, string>; start?: CourseItem[]; }) => {
  const [courses, setCourses] = useState(start);
  return (
    <>
      <input aria-label="Fallback" id="fallback-target" />
      <CourseOrderList
        courses={courses}
        onChange={setCourses}
        rowErrors={rowErrors}
        emptyFocusId="fallback-target"
      />
    </>
  );
};

const names = () => screen.getAllByTestId('course-order-name').map((el) => el.textContent);

describe('<CourseOrderList />', () => {
  beforeEach(() => initializeMocks());

  it('numbers rows, disables up on the first and down on the last', () => {
    render(<Harness />);
    expect(names()).toEqual(['Alpha', 'Beta', 'course-v1:A+3+R']);
    expect(screen.getByRole('button', { name: 'Move Alpha up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move course-v1:A+3+R down' })).toBeDisabled();
    expect(screen.getByText('Course not found')).toBeInTheDocument();
  });

  it('moves with the arrow buttons and keeps focus on the moved row\'s button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Move Alpha down' }));
    expect(names()).toEqual(['Beta', 'Alpha', 'course-v1:A+3+R']);
    expect(screen.getByRole('button', { name: 'Move Alpha down' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Move Alpha up' }));
    expect(names()).toEqual(['Alpha', 'Beta', 'course-v1:A+3+R']);
    // Alpha is first again, so "up" is disabled: focus moves to its "down" button.
    expect(screen.getByRole('button', { name: 'Move Alpha down' })).toHaveFocus();
  });

  it('removes a course', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Beta' }));
    expect(names()).toEqual(['Alpha', 'course-v1:A+3+R']);
  });

  it('after removing a row, focus moves to the same position (the next row\'s Remove button)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Remove Beta' }));
    expect(screen.getByRole('button', { name: 'Remove course-v1:A+3+R' })).toHaveFocus();
  });

  it('after removing the last row, focus moves to the previous row\'s Remove button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Remove course-v1:A+3+R' }));
    expect(screen.getByRole('button', { name: 'Remove Beta' })).toHaveFocus();
  });

  it('after removing the only row, focus moves to the fallback target', async () => {
    const user = userEvent.setup();
    render(<Harness start={[initial[0]]} />);
    await user.click(screen.getByRole('button', { name: 'Remove Alpha' }));
    expect(screen.getByLabelText('Fallback')).toHaveFocus();
  });

  it('shows a server error on the failing row', () => {
    render(<Harness rowErrors={{ 'course-v1:A+2+R': 'Course not found.' }} />);
    expect(screen.getByText('Course not found.')).toBeInTheDocument();
  });
});
