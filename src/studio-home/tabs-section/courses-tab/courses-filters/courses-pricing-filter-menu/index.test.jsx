import React from 'react';
import { useSelector } from 'react-redux';
import { screen, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import CoursesPricingFilterMenu from '.';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('CoursesPricingFilterMenu', () => {
  const onItemMenuSelectedMock = jest.fn();

  const renderComponent = () => render(
    <IntlProvider locale="en" messages={{}}>
      <CoursesPricingFilterMenu onItemMenuSelected={onItemMenuSelectedMock} />
    </IntlProvider>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useSelector.mockReturnValue({ cleanFilters: false });
  });

  it('defaults to "All types"', () => {
    renderComponent();
    expect(screen.getByTestId('dropdown-toggle-course-pricing-menu')).toHaveTextContent('All types');
  });

  it('lists every course type', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('dropdown-toggle-course-pricing-menu'));
    [
      ['all-pricing-types', 'All types'],
      ['free-courses', 'Free'],
      ['paid-courses', 'Paid'],
      ['program-only-courses', 'Program-only'],
      ['no-type-courses', 'No type'],
    ].forEach(([id, name]) => {
      expect(screen.getByTestId(`item-menu-${id}`)).toHaveTextContent(name);
    });
  });

  it.each([
    ['all-pricing-types', 'allPricingTypes'],
    ['free-courses', 'freeCourses'],
    ['paid-courses', 'paidCourses'],
    ['program-only-courses', 'programOnlyCourses'],
    ['no-type-courses', 'noTypeCourses'],
  ])('passes the %s item value to onItemMenuSelected', (id, value) => {
    renderComponent();
    fireEvent.click(screen.getByTestId('dropdown-toggle-course-pricing-menu'));
    fireEvent.click(screen.getByTestId(`item-menu-${id}`));
    expect(onItemMenuSelectedMock).toHaveBeenCalledWith(value);
  });
});
