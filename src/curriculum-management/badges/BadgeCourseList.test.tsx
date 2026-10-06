import React from 'react';
import userEvent from '@testing-library/user-event';
import { initializeMocks, render, screen } from '@src/testUtils';
import BadgeCourseList from './BadgeCourseList';

const courses = [
  { id: 'course-v1:Uber+DRV201+2026_Q4', displayName: 'Airport pickups', exists: true },
  { id: 'course-v1:Uber+DRV202+2026_Q4', displayName: null, exists: false },
];

describe('<BadgeCourseList />', () => {
  beforeEach(() => initializeMocks());

  it('lists courses, flags a missing one, shows row errors, and removes a row', async () => {
    const onChange = jest.fn();
    render(
      <BadgeCourseList
        courses={courses}
        onChange={onChange}
        rowErrors={{ [courses[0].id]: 'This course already awards "Airport pro".' }}
        emptyFocusId="search"
      />,
    );
    expect(screen.getByText('Airport pickups')).toBeInTheDocument();
    expect(screen.getByText('Course not found')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This course already awards "Airport pro".');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Airport pickups' }));
    expect(onChange).toHaveBeenCalledWith([courses[1]]);
  });

  it('says "No courses yet" for an empty list', () => {
    render(<BadgeCourseList courses={[]} onChange={jest.fn()} emptyFocusId="search" />);
    expect(screen.getByText('No courses yet')).toBeInTheDocument();
  });

  it('moves focus to the search after the last row is removed', async () => {
    const Harness = () => {
      const [list, setList] = React.useState([courses[0]]);
      return (
        <>
          <input id="search" aria-label="search" />
          <BadgeCourseList courses={list} onChange={setList} emptyFocusId="search" />
        </>
      );
    };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Airport pickups' }));
    expect(screen.getByLabelText('search')).toHaveFocus();
  });
});
