import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { StudioFooterSlot } from '@edx/frontend-component-footer';
import { Container, Tab, Tabs } from '@openedx/paragon';

import Header from '../header';
import SubHeader from '../generic/sub-header/SubHeader';
import Loading from '../generic/Loading';
import NotFoundAlert from '../generic/NotFoundAlert';
import ConnectionErrorAlert from '../generic/ConnectionErrorAlert';
import { isClientError } from '../generic/queryErrors';
import StudioHomeNav from '../curriculum-management/StudioHomeNav';

import { useUberFlags } from './data/apiHooks';
import messages from './messages';
import CoursesTab from './tabs/CoursesTab';
import CurriculumsTab from './tabs/CurriculumsTab';
import './ReportingPage.scss';

const ReportingPage = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState('courses');
  const { data: uberFlags, isPending, isError, error } = useUberFlags();

  const renderBody = () => {
    if (isPending) {
      return <Loading />;
    }
    // A 4xx is an answer - the plugin is not installed, or this is not our user - so the page does not
    // exist for them. A network error or 5xx is the same page being temporarily unreachable.
    if (isError) {
      return isClientError(error) ? <NotFoundAlert /> : <ConnectionErrorAlert />;
    }
    if (!uberFlags?.enableReporting) {
      return <NotFoundAlert />;
    }
    return (
      <div className="reporting-page">
        <Tabs
          id="reporting-tabs"
          activeKey={activeTab}
          onSelect={(key: string) => setActiveTab(key)}
        >
          <Tab eventKey="courses" title={intl.formatMessage(messages.enrollmentsTab)}>
            {activeTab === 'courses' && <CoursesTab />}
          </Tab>
          <Tab eventKey="curriculums" title={intl.formatMessage(messages.curriculumTab)}>
            {activeTab === 'curriculums' && <CurriculumsTab />}
          </Tab>
        </Tabs>
      </div>
    );
  };

  return (
    <>
      <Header isHiddenMainMenu />
      <Container size="xl" className="px-4 py-5">
        <SubHeader
          title={intl.formatMessage(messages.pageTitle)}
          subtitle={intl.formatMessage(messages.pageSubtitle)}
          hideBorder
        />
        <StudioHomeNav />
        {renderBody()}
      </Container>
      <StudioFooterSlot />
    </>
  );
};

export default ReportingPage;
