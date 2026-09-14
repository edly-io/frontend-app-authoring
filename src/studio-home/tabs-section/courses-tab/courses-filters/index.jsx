import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { SearchField } from '@openedx/paragon';
import { debounce } from 'lodash';
import { useIntl } from '@edx/frontend-platform/i18n';

import { getStudioHomeCoursesParams } from '../../../data/selectors';
import { updateStudioHomeCoursesCustomParams } from '../../../data/slice';
import { fetchStudioHomeData } from '../../../data/thunks';
import { LoadingSpinner } from '../../../../generic/Loading';
import CoursesTypesFilterMenu from './courses-types-filter-menu';
import CoursesOrderFilterMenu from './courses-order-filter-menu';
import CoursesLifecycleFilterMenu from './courses-lifecycle-filter-menu';
import './index.scss';
import messages from './messages';

/* regex to check if a string has only whitespace
  example "    "
*/
const regexOnlyWhiteSpaces = /^\s+$/;

const CoursesFilters = ({
  dispatch,
  locationValue,
  onSubmitSearchField,
  isLoading,
  showLifecycleFilter,
  resultsInfo,
}) => {
  const studioHomeCoursesParams = useSelector(getStudioHomeCoursesParams);
  const {
    order,
    search,
    activeOnly,
    archivedOnly,
    cleanFilters,
  } = studioHomeCoursesParams;
  const [inputSearchValue, setInputSearchValue] = useState('');

  const intl = useIntl();

  const getFilterTypeData = (baseFilters) => ({
    archivedCourses: { ...baseFilters, archivedOnly: true, activeOnly: undefined },
    activeCourses: { ...baseFilters, activeOnly: true, archivedOnly: undefined },
    allCourses: { ...baseFilters, archivedOnly: undefined, activeOnly: undefined },
    azCourses: { ...baseFilters, order: 'display_name' },
    zaCourses: { ...baseFilters, order: '-display_name' },
    newestCourses: { ...baseFilters, order: '-created' },
    oldestCourses: { ...baseFilters, order: 'created' },
  });

  const handleMenuFilterItemSelected = (filterType) => {
    const baseFilters = {
      currentPage: 1,
      search,
      order,
      isFiltered: true,
      archivedOnly,
      activeOnly,
      cleanFilters: false,
    };

    const filterParams = getFilterTypeData(baseFilters);
    const filterParamsFormat = filterParams[filterType] || baseFilters;
    const {
      coursesOrderLabel,
      coursesTypesLabel,
      isFiltered,
      orderTypeLabel,
      cleanFilters: cleanFilterParams,
      currentPage,
      ...customParams
    } = filterParamsFormat;
    dispatch(updateStudioHomeCoursesCustomParams(filterParamsFormat));
    dispatch(fetchStudioHomeData(locationValue, false, { page: 1, ...customParams }, true));
  };

  const handleLifecycleFilterSelected = (filterValue) => {
    const lifecycleFilter = filterValue === 'allLifecycleStates' ? undefined : filterValue;
    dispatch(updateStudioHomeCoursesCustomParams({ lifecycleFilter, isFiltered: true }));
  };

  const handleSearchCourses = (searchValueDebounced) => {
    const valueFormatted = searchValueDebounced.trim();
    const filterParams = {
      search: valueFormatted.length > 0 ? valueFormatted : '',
      activeOnly,
      archivedOnly,
      order,
    };
    const hasOnlySpaces = regexOnlyWhiteSpaces.test(searchValueDebounced);

    if (valueFormatted !== search && !hasOnlySpaces && !cleanFilters) {
      dispatch(updateStudioHomeCoursesCustomParams({
        currentPage: 1,
        isFiltered: true,
        cleanFilters: false,
        ...filterParams,
      }));

      dispatch(fetchStudioHomeData(locationValue, false, { page: 1, ...filterParams }, true));
    }

    setInputSearchValue(searchValueDebounced);
  };

  const handleSearchCoursesDebounced = useCallback(
    debounce((value) => handleSearchCourses(value), 400),
    [activeOnly, archivedOnly, order, inputSearchValue],
  );

  return (
    <div className="courses-filters">
      <div className="courses-filters__search">
        <SearchField
          onSubmit={onSubmitSearchField}
          onChange={handleSearchCoursesDebounced}
          value={cleanFilters ? '' : inputSearchValue}
          data-testid="input-filter-courses-search"
          placeholder={intl.formatMessage(messages.coursesSearchPlaceholder)}
        />
        {isLoading && (
          <span className="search-field-loading" data-testid="loading-search-spinner">
            <LoadingSpinner size="sm" />
          </span>
        )}
      </div>

      <div className="courses-filters__menus">
        <div className="courses-filters__menu">
          <CoursesTypesFilterMenu onItemMenuSelected={handleMenuFilterItemSelected} />
        </div>
        <div className="courses-filters__menu">
          <CoursesOrderFilterMenu onItemMenuSelected={handleMenuFilterItemSelected} />
        </div>
        {showLifecycleFilter && (
          <div className="courses-filters__menu">
            <CoursesLifecycleFilterMenu onItemMenuSelected={handleLifecycleFilterSelected} />
          </div>
        )}
      </div>

      {resultsInfo && <div className="courses-filters__results">{resultsInfo}</div>}
    </div>
  );
};

CoursesFilters.defaultProps = {
  locationValue: '',
  onSubmitSearchField: () => {},
  isLoading: false,
  showLifecycleFilter: false,
  resultsInfo: null,
};

CoursesFilters.propTypes = {
  dispatch: PropTypes.func.isRequired,
  locationValue: PropTypes.string,
  onSubmitSearchField: PropTypes.func,
  isLoading: PropTypes.bool,
  showLifecycleFilter: PropTypes.bool,
  resultsInfo: PropTypes.node,
};

export default CoursesFilters;
