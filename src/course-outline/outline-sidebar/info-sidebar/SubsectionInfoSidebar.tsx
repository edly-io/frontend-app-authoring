import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Tab, Tabs } from '@openedx/paragon';

import { getItemIcon } from '@src/generic/block-type-utils';

import { SidebarTitle } from '@src/generic/sidebar';

import { useCourseItemData } from '@src/course-outline/data/apiHooks';
import Loading from '@src/generic/Loading';
import { useOutlineSidebarContext } from '@src/course-outline/outline-sidebar/OutlineSidebarContext';
import { LifecycleSection } from '@src/course-lifecycle';
import { InfoSection } from './InfoSection';
import messages from '../messages';

interface Props {
  subsectionId: string;
}

export const SubsectionSidebar = ({ subsectionId }: Props) => {
  const intl = useIntl();
  const [tab, setTab] = useState<'info' | 'settings'>('info');
  const { data: subsectionData, isLoading } = useCourseItemData(subsectionId);
  const { clearSelection } = useOutlineSidebarContext();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <SidebarTitle
        title={subsectionData?.displayName || ''}
        icon={getItemIcon(subsectionData?.category || '')}
        onBackBtnClick={clearSelection}
      />
      <LifecycleSection usageKey={subsectionId} title="Subsection Status" hasChanges={subsectionData?.hasChanges} />
      <Tabs
        variant="tabs"
        className="my-2 mx-n3.5"
        id="add-content-tabs"
        activeKey={tab}
        onSelect={setTab}
        mountOnEnter
      >
        <Tab eventKey="info" title={intl.formatMessage(messages.infoTabText)}>
          <InfoSection itemId={subsectionId} />
        </Tab>
        <Tab eventKey="settings" title={intl.formatMessage(messages.settingsTabText)}>
          <div>Settings</div>
        </Tab>
      </Tabs>
    </>
  );
};
