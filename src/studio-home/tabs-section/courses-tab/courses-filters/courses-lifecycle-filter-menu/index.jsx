import PropTypes from 'prop-types';

import CoursesFilterMenu from '../courses-filter-menu';

const lifecycleStates = [
  {
    id: 'all-lifecycle',
    name: 'All Review States',
    value: 'allLifecycleStates',
  },
  {
    id: 'draft',
    name: 'Draft',
    value: 'draft',
  },
  {
    id: 'for-review',
    name: 'For Review',
    value: 'for_review',
  },
  {
    id: 'approved',
    name: 'Approved',
    value: 'approved',
  },
];

const CoursesLifecycleFilterMenu = ({ onItemMenuSelected }) => (
  <CoursesFilterMenu
    id="dropdown-toggle-lifecycle-filter-menu"
    menuItems={lifecycleStates}
    onItemMenuSelected={onItemMenuSelected}
    defaultItemSelectedText="All Review States"
  />
);

CoursesLifecycleFilterMenu.propTypes = {
  onItemMenuSelected: PropTypes.func.isRequired,
};

export default CoursesLifecycleFilterMenu;
