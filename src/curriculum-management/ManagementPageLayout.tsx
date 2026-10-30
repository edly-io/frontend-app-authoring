import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useMatch,
} from 'react-router-dom';
import { useBlocker } from 'react-router';
import { StudioFooterSlot } from '@edx/frontend-component-footer';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { MessageDescriptor } from 'react-intl';
import {
  Button,
  Container,
  Layout,
  Nav,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';

import Header from '../header';
import SubHeader from '../generic/sub-header/SubHeader';
import Loading from '../generic/Loading';
import NotFoundAlert from '../generic/NotFoundAlert';
import ConnectionErrorAlert from '../generic/ConnectionErrorAlert';
import { HelpSidebar } from '../generic/help-sidebar';
import {
  BADGES_PATH,
  COURSE_GROUPS_PATH,
  CURRICULUM_MANAGEMENT_PATH,
  DEEP_LINKS_PATH,
} from './constants';
import { useBadges, useCurriculums, useCurriculumManagementStatus } from './data/apiHooks';
import ConfirmNavigationModal from './ConfirmNavigationModal';
import StudioHomeNav from './StudioHomeNav';
import type { CurriculumManagementOutletContext, FormTarget, ManagementSection } from './types';
import messages from './messages';
import './CurriculumManagement.scss';

/** Per-tab copy; the shell itself is shared. A tab without `newLabel` has no New button (nothing to create). */
const SECTIONS: Record<ManagementSection, {
  newLabel?: MessageDescriptor;
  help: [MessageDescriptor, MessageDescriptor][];
}> = {
  curriculums: {
    newLabel: messages.newCurriculum,
    help: [
      [messages.sidebarCurriculumsTitle, messages.sidebarCurriculumsBody],
      [messages.sidebarBadgesTitle, messages.sidebarCurriculumBadgesBody],
      [messages.sidebarKnowledgeCheckTitle, messages.sidebarKnowledgeCheckBody],
    ],
  },
  badges: {
    newLabel: messages.newBadge,
    help: [
      [messages.sidebarBadgesTitle, messages.sidebarBadgesBody],
      [messages.sidebarCourseBadgesTitle, messages.sidebarCourseBadgesBody],
    ],
  },
  courseGroups: {
    newLabel: messages.newCourseGroup,
    help: [
      [messages.sidebarCourseGroupsTitle, messages.sidebarCourseGroupsBody],
      [messages.sidebarGroupIdTitle, messages.sidebarGroupIdBody],
      [messages.sidebarLearnerFlagTitle, messages.sidebarLearnerFlagBody],
    ],
  },
  deepLinks: {
    newLabel: messages.newDeepLink,
    help: [
      [messages.sidebarDeepLinksTitle, messages.sidebarDeepLinksBody],
      [messages.sidebarTestLinksTitle, messages.sidebarTestLinksBody],
    ],
  },
};

/** The tab bar: path and label, in order. `end` keeps Curriculum inactive on the other paths. */
const TABS: [string, MessageDescriptor][] = [
  [CURRICULUM_MANAGEMENT_PATH, messages.navCurriculums],
  [BADGES_PATH, messages.navBadges],
  [COURSE_GROUPS_PATH, messages.navCourseGroups],
  [DEEP_LINKS_PATH, messages.navDeepLinks],
];

/**
 * Shell of the Curriculum management page: Curriculum (index), Badges, Course groups and Deep links tabs as
 * child routes, gated by the `uber_features.curriculum_management` flag (spec §7.3).
 */
const ManagementPageLayout = () => {
  const intl = useIntl();
  const { pathname } = useLocation();
  const onBadges = useMatch(BADGES_PATH);
  const onCourseGroups = useMatch(COURSE_GROUPS_PATH);
  const onDeepLinks = useMatch(DEEP_LINKS_PATH);
  let section: ManagementSection = 'curriculums';
  if (onBadges) {
    section = 'badges';
  } else if (onCourseGroups) {
    section = 'courseGroups';
  } else if (onDeepLinks) {
    section = 'deepLinks';
  }
  // Status and both lists start together (no waterfall). Both tabs need both lists: the curriculum
  // form's slot selects list the badges.
  const status = useCurriculumManagementStatus();
  const curriculums = useCurriculums();
  const badges = useBadges();
  const copy = SECTIONS[section];

  // A form never outlives its tab. The target is stored with the path it was opened on and
  // reset during render (not in an effect), so the other tab never mounts with a stale 'new'.
  const [formState, setFormState] = useState<{ pathname: string; target: FormTarget; }>({ pathname, target: null });
  if (formState.pathname !== pathname) {
    setFormState({ pathname, target: null });
  }
  const formTarget = formState.pathname === pathname ? formState.target : null;
  const setFormTargetState = (target: FormTarget) => setFormState({ pathname, target });
  const [formDirty, setFormDirty] = useState(false);
  /** Reference content the current tab shows above the help text (the Deep links tab's launch string fields). */
  const [sidebarExtra, setSidebarExtra] = useState<ReactNode>(null);
  /** A form switch waiting for the unsaved-changes prompt; `undefined` = none pending. */
  const [pendingTarget, setPendingTarget] = useState<FormTarget | undefined>(undefined);
  const blocker = useBlocker(formDirty);

  const setFormTarget = (target: FormTarget) => {
    if (target === formTarget) {
      // Already open: nothing to switch, so nothing to discard.
      return;
    }
    if (formDirty) {
      setPendingTarget(target);
    } else {
      setFormTargetState(target);
    }
  };

  const context: CurriculumManagementOutletContext = {
    formTarget,
    setFormTarget,
    closeForm: () => {
      setFormTargetState(null);
      setFormDirty(false);
    },
    setFormDirty,
    setSidebarExtra,
  };

  // `formDirty` is not cleared here: it is the open form's own state, and FormDirtyReporter
  // resets it when that form unmounts. A discard that keeps the same form mounted must keep it.
  const handleConfirm = () => {
    if (pendingTarget !== undefined) {
      setFormTargetState(pendingTarget);
      setPendingTarget(undefined);
    }
    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    }
  };

  const handleCancel = () => {
    setPendingTarget(undefined);
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  };

  const newButton = copy.newLabel && (
    <Button iconBefore={Add} onClick={() => setFormTarget('new')}>
      {intl.formatMessage(copy.newLabel)}
    </Button>
  );

  const listsFailed = curriculums.isError || badges.isError;
  // Without the lists there is no <Outlet> to render a form into, so there is nothing to create from.
  const canCreate = status.enabled && !listsFailed && !!copy.newLabel;

  const renderBody = () => {
    if (status.isPending) {
      return <Loading />;
    }
    if (status.isConnectionError) {
      return <ConnectionErrorAlert />;
    }
    if (!status.enabled) {
      return <NotFoundAlert />;
    }
    if (listsFailed) {
      return <ConnectionErrorAlert />;
    }
    return (
      <>
        {/* NavLink sets the `active` class and aria-current="page"; `end` keeps Curriculum inactive on /badges. */}
        <Nav as="nav" variant="tabs" className="mb-4" aria-label={intl.formatMessage(messages.navLabel)}>
          {TABS.map(([path, label]) => (
            <Nav.Item key={path}>
              <NavLink to={path} end={path === CURRICULUM_MANAGEMENT_PATH} className="nav-link">
                {intl.formatMessage(label)}
              </NavLink>
            </Nav.Item>
          ))}
        </Nav>
        <Layout
          lg={[{ span: 9 }, { span: 3 }]}
          md={[{ span: 12 }, { span: 12 }]}
          sm={[{ span: 12 }, { span: 12 }]}
          xs={[{ span: 12 }, { span: 12 }]}
          xl={[{ span: 9 }, { span: 3 }]}
        >
          <Layout.Element>
            <Outlet context={context} />
          </Layout.Element>
          <Layout.Element>
            <HelpSidebar courseId="">
              {sidebarExtra}
              {copy.help.map(([heading, body]) => (
                <div key={heading.id}>
                  <h4 className="help-sidebar-about-title">{intl.formatMessage(heading)}</h4>
                  <p className="help-sidebar-about-descriptions">{intl.formatMessage(body)}</p>
                </div>
              ))}
            </HelpSidebar>
          </Layout.Element>
        </Layout>
      </>
    );
  };

  return (
    <div className="curriculum-management">
      <Header isHiddenMainMenu />
      <Container size="xl" className="px-4 py-5">
        <SubHeader
          title={intl.formatMessage(messages.pageTitle)}
          headerActions={canCreate ? newButton : null}
          hideBorder
        />
        {status.enabled && <StudioHomeNav />}
        {renderBody()}
      </Container>
      <StudioFooterSlot />
      <ConfirmNavigationModal
        isOpen={blocker.state === 'blocked' || pendingTarget !== undefined}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ManagementPageLayout;
