import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

import CoursesFilterMenu from '../courses-filter-menu';

/** Filters the course list by course type (Free, Paid, Program-only, or no type yet). */
const CoursesPricingFilterMenu = ({ onItemMenuSelected }) => {
  const intl = useIntl();

  const pricingTypes = useMemo(
    () => [
      {
        id: 'all-pricing-types',
        name: intl.formatMessage(messages.coursesPricingFilterMenuAllTypes),
        value: 'allPricingTypes',
      },
      {
        id: 'free-courses',
        name: intl.formatMessage(messages.coursesPricingFilterMenuFree),
        value: 'freeCourses',
      },
      {
        id: 'paid-courses',
        name: intl.formatMessage(messages.coursesPricingFilterMenuPaid),
        value: 'paidCourses',
      },
      {
        id: 'program-only-courses',
        name: intl.formatMessage(messages.coursesPricingFilterMenuProgramOnly),
        value: 'programOnlyCourses',
      },
      {
        id: 'no-type-courses',
        name: intl.formatMessage(messages.coursesPricingFilterMenuNoType),
        value: 'noTypeCourses',
      },
    ],
    [intl],
  );

  return (
    <CoursesFilterMenu
      id="dropdown-toggle-course-pricing-menu"
      menuItems={pricingTypes}
      onItemMenuSelected={onItemMenuSelected}
      defaultItemSelectedText={intl.formatMessage(messages.coursesPricingFilterMenuAllTypes)}
    />
  );
};

CoursesPricingFilterMenu.propTypes = {
  onItemMenuSelected: PropTypes.func.isRequired,
};

export default CoursesPricingFilterMenu;
