import { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Badge,
  Stack,
  Tab,
  Tabs,
} from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useNavigate, useLocation } from 'react-router-dom';

import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { RequestStatus } from '@src/data/constants';
import { getLoadingStatuses, getStudioHomeData } from '../data/selectors';
import messages from './messages';
import { BaseFilterState, Filter, LibrariesList } from './libraries-tab';
import LibrariesV2List from './libraries-v2-tab/index';
import CoursesTab from './courses-tab';
import ProgramsTab from './programs-tab';
import InstructorsTab from './instructors-tab';
import CategoriesTab from './categories-tab';
import { WelcomeLibrariesV2Alert } from './libraries-v2-tab/WelcomeLibrariesV2Alert';

const TabsSection = ({
  showNewCourseContainer,
  showNewProgramContainer,
  showNewInstructorContainer,
  showNewCategoryContainer,
  onClickNewCourse,
  isShowProcessing,
  librariesV1Enabled,
  librariesV2Enabled,
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [migrationFilter, setMigrationFilter] = useState<Filter[]>(BaseFilterState);
  const TABS_LIST = {
    courses: 'courses',
    programs: 'programs',
    instructors: 'instructors',
    categories: 'categories',
    libraries: 'libraries',
    legacyLibraries: 'legacyLibraries',
    archived: 'archived',
    taxonomies: 'taxonomies',
  } as const;
  type TabKeyType = keyof typeof TABS_LIST;

  const initTabKeyState = (pname: string) => {
    if (pname.includes('/libraries-v1')) {
      return TABS_LIST.legacyLibraries;
    }

    if (pname.includes('/libraries')) {
      return librariesV2Enabled
        ? TABS_LIST.libraries
        : TABS_LIST.legacyLibraries;
    }

    if (pname.includes('/programs')) {
      return TABS_LIST.programs;
    }

    if (pname.includes('/instructors')) {
      return TABS_LIST.instructors;
    }

    if (pname.includes('/categories')) {
      return TABS_LIST.categories;
    }

    // Default to courses tab
    return TABS_LIST.courses;
  };

  const [tabKey, setTabKey] = useState<TabKeyType>(initTabKeyState(pathname));

  // This is needed to handle navigating using the back/forward buttons in the browser
  useEffect(() => {
    setTabKey(initTabKeyState(pathname));
  }, [pathname]);

  const { courses, numPages, coursesCount } = useSelector(getStudioHomeData);
  const {
    courseLoadingStatus,
  } = useSelector(getLoadingStatuses);
  const isLoadingCourses = courseLoadingStatus === RequestStatus.IN_PROGRESS;
  const isFailedCoursesPage = courseLoadingStatus === RequestStatus.FAILED;

  // Controlling the visibility of tabs when using conditional rendering is necessary for
  // the correct operation of iterating over child elements inside the Paragon Tabs component.
  const visibleTabs = useMemo(() => {
    const tabs: JSX.Element[] = [];
    tabs.push(
      <Tab
        key={TABS_LIST.courses}
        eventKey={TABS_LIST.courses}
        title={intl.formatMessage(messages.coursesTabTitle)}
      >
        <CoursesTab
          coursesDataItems={courses}
          showNewCourseContainer={showNewCourseContainer}
          onClickNewCourse={onClickNewCourse}
          isShowProcessing={isShowProcessing}
          isLoading={isLoadingCourses}
          isFailed={isFailedCoursesPage}
          numPages={numPages}
          coursesCount={coursesCount}
        />
      </Tab>,
    );

    if (getConfig().ENABLE_PROGRAMS) {
      tabs.push(
        <Tab
          key={TABS_LIST.programs}
          eventKey={TABS_LIST.programs}
          title={intl.formatMessage(messages.programsTabTitle)}
        >
          <ProgramsTab showNewProgramContainer={showNewProgramContainer} />
        </Tab>,
      );
    }

    if (getConfig().ENABLE_INSTRUCTOR_MANAGEMENT) {
      tabs.push(
        <Tab
          key={TABS_LIST.instructors}
          eventKey={TABS_LIST.instructors}
          title={intl.formatMessage(messages.instructorsTabTitle)}
        >
          <InstructorsTab showNewInstructorContainer={showNewInstructorContainer} />
        </Tab>,
      );
    }

    if (getAuthenticatedUser()?.administrator) {
      tabs.push(
        <Tab
          key={TABS_LIST.categories}
          eventKey={TABS_LIST.categories}
          title={intl.formatMessage(messages.categoriesTabTitle)}
        >
          <CategoriesTab />
        </Tab>,
      );
    }

    if (librariesV2Enabled) {
      tabs.push(
        <Tab
          key={TABS_LIST.libraries}
          eventKey={TABS_LIST.libraries}
          title={(
            <Stack gap={2} direction="horizontal">
              {intl.formatMessage(messages.librariesTabTitle)}
              <Badge variant="info">{intl.formatMessage(messages.librariesV2TabBetaBadge)}</Badge>
            </Stack>
          )}
        >
          <div>
            <WelcomeLibrariesV2Alert />
            <LibrariesV2List />
          </div>
        </Tab>,
      );
    }

    if (librariesV1Enabled) {
      tabs.push(
        <Tab
          key={TABS_LIST.legacyLibraries}
          eventKey={TABS_LIST.legacyLibraries}
          title={intl.formatMessage(
            librariesV2Enabled
              ? messages.legacyLibrariesTabTitle
              : messages.librariesTabTitle,
          )}
        >
          <LibrariesList
            migrationFilter={migrationFilter}
            setMigrationFilter={setMigrationFilter}
          />
        </Tab>,
      );
    }

    if (getConfig().ENABLE_TAGGING_TAXONOMY_PAGES === 'true') {
      tabs.push(
        <Tab
          key={TABS_LIST.taxonomies}
          eventKey={TABS_LIST.taxonomies}
          title={intl.formatMessage(messages.taxonomiesTabTitle)}
        />,
      );
    }

    return tabs;
  }, [
    showNewCourseContainer,
    showNewProgramContainer,
    showNewInstructorContainer,
    showNewCategoryContainer,
    isLoadingCourses,
    migrationFilter,
  ]);

  const handleSelectTab = (tab: TabKeyType) => {
    if (tab === TABS_LIST.courses) {
      navigate('/home');
    } else if (tab === TABS_LIST.programs) {
      navigate('/programs');
    } else if (tab === TABS_LIST.instructors) {
      navigate('/instructors');
    } else if (tab === TABS_LIST.categories) {
      navigate('/categories');
    } else if (tab === TABS_LIST.legacyLibraries) {
      navigate('/libraries-v1');
    } else if (tab === TABS_LIST.libraries) {
      navigate('/libraries');
    } else if (tab === TABS_LIST.taxonomies) {
      navigate('/taxonomies');
    }
    setTabKey(tab);
  };

  return (
    <Tabs
      className="studio-home-tabs"
      variant="tabs"
      activeKey={tabKey}
      onSelect={handleSelectTab}
    >
      {visibleTabs}
    </Tabs>
  );
};

TabsSection.propTypes = {
  showNewCourseContainer: PropTypes.bool.isRequired,
  onClickNewCourse: PropTypes.func.isRequired,
  isShowProcessing: PropTypes.bool.isRequired,
  librariesV1Enabled: PropTypes.bool,
  librariesV2Enabled: PropTypes.bool,
  showNewProgramContainer: PropTypes.bool,
  showNewInstructorContainer: PropTypes.bool,
  showNewCategoryContainer: PropTypes.bool,
};

export default TabsSection;
