import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Nav } from '@openedx/paragon';

import { fetchOnlyStudioHomeData } from '@src/studio-home/data/thunks';
import { getStudioHomeData } from '@src/studio-home/data/selectors';
import homeTabMessages from '@src/studio-home/tabs-section/messages';
import { CURRICULUM_MANAGEMENT_PATH } from './constants';
import messages from './messages';

/**
 * The Studio home tab bar (Courses, Libraries, ..., Curriculum Management), shown on the Curriculum
 * management page so it reads as one of the home tabs. Visibility mirrors studio-home's TabsSection.
 */
const StudioHomeNav = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const { librariesV1Enabled, librariesV2Enabled } = useSelector(getStudioHomeData);

  useEffect(() => {
    dispatch(fetchOnlyStudioHomeData());
  }, []);

  const tabs: [string, string][] = [['/home', intl.formatMessage(homeTabMessages.coursesTabTitle)]];
  if (librariesV2Enabled) {
    tabs.push(['/libraries', intl.formatMessage(homeTabMessages.librariesTabTitle)]);
  }
  if (librariesV1Enabled) {
    tabs.push([
      '/libraries-v1',
      intl.formatMessage(
        librariesV2Enabled ? homeTabMessages.legacyLibrariesTabTitle : homeTabMessages.librariesTabTitle,
      ),
    ]);
  }
  if (getConfig().ENABLE_TAGGING_TAXONOMY_PAGES === 'true') {
    tabs.push(['/taxonomies', intl.formatMessage(homeTabMessages.taxonomiesTabTitle)]);
  }
  tabs.push([CURRICULUM_MANAGEMENT_PATH, intl.formatMessage(messages.homeTabTitle)]);

  return (
    <Nav as="nav" variant="tabs" className="studio-home-tabs" aria-label={intl.formatMessage(messages.homeNavLabel)}>
      {tabs.map(([path, title]) => (
        <Nav.Item key={path}>
          <NavLink to={path} className="nav-link">{title}</NavLink>
        </Nav.Item>
      ))}
    </Nav>
  );
};

export default StudioHomeNav;
